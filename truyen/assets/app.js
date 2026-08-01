// ==== CAU HINH ====
const CFG = {
  owner: "greatlove8704",
  repo: "15aiagent",
  branch: "main",
  apiDir: "truyen/chapters", // duong dan trong repo
  localDir: "chapters",      // duong dan tuong doi tu trang nay
};
// ==================

const CACHE_KEY = "chapters_cache_v1";
const CACHE_TTL = 10 * 60 * 1000; // 10 phut

function esc(s) {
  return s.replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function parseName(filename) {
  const base = filename.replace(/\.txt$/i, "");
  const m = base.match(/^\s*(\d+)\s*[-\u2013\u2014.]\s*(.+)$/);
  if (m) {
    return { order: parseInt(m[1], 10), num: String(parseInt(m[1], 10)), title: m[2].trim(), file: filename };
  }
  return { order: 1e9, num: "", title: base, file: filename };
}

async function fetchFromApi() {
  const url =
    "https://api.github.com/repos/" + CFG.owner + "/" + CFG.repo +
    "/contents/" + CFG.apiDir + "?ref=" + CFG.branch;
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!res.ok) throw new Error("API " + res.status);
  const items = await res.json();
  return items
    .filter(function (i) { return i.type === "file" && /\.txt$/i.test(i.name); })
    .map(function (i) { return parseName(i.name); });
}

async function fetchFromManifest() {
  const res = await fetch(CFG.localDir + "/index.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("khong co manifest");
  const names = await res.json();
  return names.map(parseName);
}

export async function getChapters() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const c = JSON.parse(raw);
      if (Date.now() - c.at < CACHE_TTL) return c.data;
    }
  } catch (e) {}

  let list;
  try {
    list = await fetchFromApi();
  } catch (e) {
    list = await fetchFromManifest();
  }
  list.sort(function (a, b) {
    return a.order - b.order || a.title.localeCompare(b.title, "vi");
  });

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: list }));
  } catch (e) {}
  return list;
}

export async function getChapterText(file) {
  const res = await fetch(CFG.localDir + "/" + encodeURIComponent(file), { cache: "no-cache" });
  if (!res.ok) throw new Error("Khong doc duoc chuong nay.");
  return res.text();
}

export function renderText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map(function (p) { return p.trim(); })
    .filter(Boolean)
    .map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; })
    .join("\n");
}

export function qs(name) {
  return new URLSearchParams(location.search).get(name);
}
