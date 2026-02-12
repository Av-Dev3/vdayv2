#!/usr/bin/env node
import { open, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "media";
const CHUNK_MB = Number(process.env.CHUNK_MB || 8);
const TARGET_REL = process.env.TARGET_REL || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required env vars:");
  console.error("- SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, "data", "supabase-upload-report.json");
const MAP_PATH = path.join(ROOT, "data", "supabase-media-map.json");

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function objectKeyFor(rel) {
  return rel.replace(/~/g, "-").replace(/\\/g, "/");
}

function publicUrlFor(rel) {
  const key = objectKeyFor(rel);
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${encodeURI(key)}`;
}

function b64(v) {
  return Buffer.from(String(v), "utf8").toString("base64");
}

function contentTypeFor(rel) {
  const ext = path.extname(rel).toLowerCase();
  const map = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".m4v": "video/x-m4v",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
    ".webm": "video/webm",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  return map[ext] || "application/octet-stream";
}

async function createUpload(rel, size, contentType) {
  const key = objectKeyFor(rel);
  const metadata = [
    `bucketName ${b64(SUPABASE_BUCKET)}`,
    `objectName ${b64(key)}`,
    `contentType ${b64(contentType)}`,
    `cacheControl ${b64("3600")}`,
  ].join(",");

  const url = `${SUPABASE_URL}/storage/v1/upload/resumable`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      "x-upsert": "true",
      "tus-resumable": "1.0.0",
      "upload-length": String(size),
      "upload-metadata": metadata,
    },
  });

  if (!(res.status === 201 || res.status === 200)) {
    const txt = await res.text();
    throw new Error(`Failed to create resumable upload (${res.status}): ${txt}`);
  }

  const location = res.headers.get("location");
  if (!location) throw new Error("Missing upload location header");
  if (/^https?:\/\//i.test(location)) return location;
  return `${SUPABASE_URL}${location.startsWith("/") ? "" : "/"}${location}`;
}

async function patchChunks(uploadUrl, absFile, size) {
  const chunkSize = Math.max(1, Math.floor(CHUNK_MB * 1024 * 1024));
  const fh = await open(absFile, "r");
  let offset = 0;
  try {
    while (offset < size) {
      const len = Math.min(chunkSize, size - offset);
      const buffer = Buffer.allocUnsafe(len);
      const { bytesRead } = await fh.read(buffer, 0, len, offset);
      if (!bytesRead) break;
      const chunk = bytesRead === len ? buffer : buffer.subarray(0, bytesRead);
      const res = await fetch(uploadUrl, {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          "tus-resumable": "1.0.0",
          "upload-offset": String(offset),
          "content-type": "application/offset+octet-stream",
          "content-length": String(chunk.length),
        },
        body: chunk,
      });
      if (!(res.status === 204 || res.status === 200)) {
        const txt = await res.text();
        throw new Error(`Chunk upload failed at offset ${offset} (${res.status}): ${txt}`);
      }
      const nextOffset = Number(res.headers.get("upload-offset"));
      if (Number.isFinite(nextOffset) && nextOffset > offset) {
        offset = nextOffset;
      } else {
        offset += chunk.length;
      }
      const pct = ((offset / size) * 100).toFixed(1);
      process.stdout.write(`\r  ${pct}%`);
    }
    process.stdout.write("\n");
  } finally {
    await fh.close();
  }
}

async function main() {
  const reportRaw = await readFile(REPORT_PATH, "utf8").catch(() => "{}");
  const report = JSON.parse(reportRaw || "{}");
  let large = Array.isArray(report.skipped_too_large) ? report.skipped_too_large : [];
  if (TARGET_REL.trim()) {
    large = TARGET_REL.split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((rel) => ({ rel }));
  }
  if (!large.length) {
    console.log("No target files found (skipped list empty and TARGET_REL not set).");
    return;
  }

  const mapRaw = await readFile(MAP_PATH, "utf8").catch(() => "{}");
  const mediaMap = JSON.parse(mapRaw);

  let uploaded = 0;
  let failed = 0;
  const stillSkipped = [];

  for (const item of large) {
    const rel = String(item.rel || "");
    if (!rel) continue;
    const abs = path.join(ROOT, rel);
    try {
      const meta = await stat(abs);
      if (!meta.isFile()) throw new Error("Not a file");
      const ct = contentTypeFor(rel);
      console.log(`Uploading ${toPosix(rel)} (${(meta.size / (1024 * 1024)).toFixed(2)}MB)`);
      const uploadUrl = await createUpload(rel, meta.size, ct);
      await patchChunks(uploadUrl, abs, meta.size);
      mediaMap[rel] = publicUrlFor(rel);
      uploaded += 1;
      console.log(`[OK] ${rel}`);
    } catch (err) {
      failed += 1;
      stillSkipped.push(item);
      console.error(`[FAIL] ${rel} :: ${err.message}`);
    }
  }

  report.skipped_too_large = stillSkipped;
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  await writeFile(MAP_PATH, JSON.stringify(mediaMap, null, 2), "utf8");

  console.log(`\nResumable upload done. Uploaded: ${uploaded}, Failed: ${failed}`);
  console.log(`Updated: ${toPosix(path.relative(ROOT, REPORT_PATH))}`);
  console.log(`Updated: ${toPosix(path.relative(ROOT, MAP_PATH))}`);
  if (failed > 0) process.exitCode = 2;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
