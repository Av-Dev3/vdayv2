let mediaMap = {};
let initialized = false;
let observer = null;

function normalizePath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(data:|blob:|https?:)/i.test(raw)) {
    try {
      const url = new URL(raw, window.location.href);
      if (url.origin !== window.location.origin) return raw;
      return decodeURI(url.pathname.replace(/^\/+/, ""));
    } catch {
      return raw;
    }
  }
  try {
    return decodeURI(
      raw
        .split("#")[0]
        .split("?")[0]
        .replace(/\\/g, "/")
        .replace(/^\.?\//, "")
    );
  } catch {
    return raw.replace(/\\/g, "/").replace(/^\.?\//, "");
  }
}

export function resolveMedia(path) {
  const key = normalizePath(path);
  if (!key) return path;
  return mediaMap[key] || path;
}

function rewriteNodeMedia(node) {
  if (!node || node.nodeType !== 1) return;
  const attrs = ["src", "poster"];
  attrs.forEach((attr) => {
    const current = node.getAttribute(attr);
    if (!current) return;
    const next = resolveMedia(current);
    if (next !== current) node.setAttribute(attr, next);
  });
}

function rewriteTree(root = document) {
  rewriteNodeMedia(root);
  if (!root.querySelectorAll) return;
  root.querySelectorAll("[src], [poster]").forEach(rewriteNodeMedia);
}

function startObserver() {
  if (observer) return;
  observer = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      if (m.type === "attributes" && m.target) {
        rewriteNodeMedia(m.target);
      }
      if (m.type === "childList" && m.addedNodes) {
        m.addedNodes.forEach((n) => rewriteTree(n));
      }
    });
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["src", "poster"],
  });
}

export async function initMediaMap() {
  if (initialized) return;
  initialized = true;
  try {
    const res = await fetch("data/supabase-media-map.json", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json && typeof json === "object") mediaMap = json;
    }
  } catch {
    mediaMap = {};
  }
  rewriteTree(document);
  startObserver();
}

