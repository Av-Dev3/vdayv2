#!/usr/bin/env node
import { readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "media";
const DRY_RUN = String(process.env.DRY_RUN || "").toLowerCase() === "true";
const MAX_DIRECT_MB = Number(process.env.MAX_DIRECT_MB || 49);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required env vars:");
  console.error("- SUPABASE_URL");
  console.error("- SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const ROOT = process.cwd();
const OUTPUT_MAP = path.join(ROOT, "data", "supabase-media-map.json");
const OUTPUT_REPORT = path.join(ROOT, "data", "supabase-upload-report.json");

const MEDIA_EXT = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".bmp", ".svg",
  ".mp4", ".webm", ".mov", ".m4v", ".avi", ".mkv",
  ".mp3", ".wav", ".ogg", ".m4a", ".flac",
  ".lrc", ".srt",
  ".ttf", ".otf", ".woff", ".woff2",
]);

const SKIP_DIRS = new Set([
  ".git",
  ".vscode",
  "node_modules",
  "scripts",
  "css",
  "js",
]);

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".flac": "audio/flac",
  ".lrc": "text/plain; charset=utf-8",
  ".srt": "text/plain; charset=utf-8",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function contentTypeFor(file) {
  const ext = path.extname(file).toLowerCase();
  return MIME[ext] || "application/octet-stream";
}

function objectKeyFor(rel) {
  // Supabase Storage keys reject some characters like "~" in this project setup.
  return rel.replace(/~/g, "-").replace(/\\/g, "/");
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    const rel = path.relative(ROOT, abs);
    const relPosix = toPosix(rel);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      out.push(...(await walk(abs)));
      continue;
    }
    const ext = path.extname(e.name).toLowerCase();
    if (!MEDIA_EXT.has(ext)) continue;
    if (relPosix === "data/supabase-media-map.json") continue;
    out.push({ abs, rel: relPosix });
  }
  return out;
}

async function fileToBuffer(abs) {
  const f = await stat(abs);
  if (!f.isFile()) return null;
  const bytes = await BunOrNodeRead(abs);
  return bytes;
}

async function BunOrNodeRead(abs) {
  // Works in Node; Bun-compatible fallback is unnecessary here but harmless.
  const { readFile } = await import("node:fs/promises");
  return readFile(abs);
}

async function ensureBucket() {
  const url = `${SUPABASE_URL}/storage/v1/bucket`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: SUPABASE_BUCKET,
      name: SUPABASE_BUCKET,
      public: true,
    }),
  });
  // 200/201 = created. Some Supabase deployments return 400 with a 409-style duplicate payload.
  if (res.ok || res.status === 409) return;
  const txt = await res.text();
  let parsed = null;
  try {
    parsed = JSON.parse(txt);
  } catch {
    parsed = null;
  }
  const duplicate =
    (parsed && (parsed.statusCode === 409 || String(parsed.error || "").toLowerCase() === "duplicate")) ||
    /already exists|duplicate/i.test(txt);
  if (duplicate) return;
  throw new Error(`Bucket create/check failed (${res.status}): ${txt}`);
}

async function uploadFile(rel, bytes, contentType) {
  const key = objectKeyFor(rel);
  const objectPath = encodeURI(key);
  const url = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${objectPath}`;
  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body: bytes,
      });
      if (res.ok) return { key };
      const txt = await res.text();
      throw new Error(`Upload failed (${res.status}): ${txt}`);
    } catch (err) {
      lastErr = err;
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, attempt * 400));
      }
    }
  }
  throw new Error(`Upload failed for ${rel}: ${lastErr?.message || "unknown error"}`);
}

function toPublicUrl(rel) {
  const key = objectKeyFor(rel);
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${encodeURI(key)}`;
}

async function main() {
  const files = await walk(ROOT);
  files.sort((a, b) => a.rel.localeCompare(b.rel));
  if (!files.length) {
    console.log("No media files found.");
    return;
  }

  console.log(`Found ${files.length} media files.`);
  if (!DRY_RUN) {
    await ensureBucket();
  }

  const map = {};
  const report = {
    uploaded: [],
    failed: [],
    skipped_too_large: [],
  };
  let ok = 0;
  let fail = 0;

  for (const f of files) {
    const ct = contentTypeFor(f.rel);
    const publicUrl = toPublicUrl(f.rel);
    try {
      if (!DRY_RUN) {
        const meta = await stat(f.abs);
        const mb = meta.size / (1024 * 1024);
        if (mb > MAX_DIRECT_MB) {
          report.skipped_too_large.push({ rel: f.rel, mb: Number(mb.toFixed(2)) });
          console.log(`[SKIP>SIZE] ${f.rel} (${mb.toFixed(2)}MB)`);
          continue;
        }
        const bytes = await fileToBuffer(f.abs);
        if (!bytes) throw new Error("Could not read file");
        await uploadFile(f.rel, bytes, ct);
      }
      map[f.rel] = publicUrl;
      report.uploaded.push(f.rel);
      ok += 1;
      console.log(`[OK] ${f.rel}`);
    } catch (err) {
      fail += 1;
      report.failed.push({ rel: f.rel, error: err.message });
      console.error(`[FAIL] ${f.rel} :: ${err.message}`);
    }
  }

  await writeFile(OUTPUT_MAP, JSON.stringify(map, null, 2), "utf8");
  await writeFile(OUTPUT_REPORT, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nDone. Success: ${ok}, Failed: ${fail}`);
  console.log(`URL map saved to: ${toPosix(path.relative(ROOT, OUTPUT_MAP))}`);
  console.log(`Report saved to: ${toPosix(path.relative(ROOT, OUTPUT_REPORT))}`);
  if (fail > 0) process.exitCode = 2;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
