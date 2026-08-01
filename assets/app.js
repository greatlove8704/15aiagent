// ============================================================
//  SỬA 3 DÒNG DƯỚI ĐÂY ĐỂ ĐỔI TÊN TRUYỆN / BÚT DANH / GIỚI THIỆU
// ============================================================
export const META = {
  title: "Tên truyện của bạn",
  author: "Bút danh",
  // Xuống dòng bằng cách gõ Enter bình thường trong cặp dấu `...`
  intro: `Viết giới thiệu truyện ở đây.`,
};

// ==== CẤU HÌNH KỬTHUẬT (đừng sửa nếu không cần) ====
const CFG = {
  owner: "greatlove8704",
  repo: "15aiagent",
  branch: "main",
  apiDir: "chapters",
  localDir: "chapters",
};
// ==================================================

const CACHE_KEY = "chapters_cache_v3";
const CACHE_TTL = 10 * 60 * 1000; // 10 phut
const PART_RE = /^(.*)\.part(\d+)\.txt$/i;

function esc(s) {
  return s.replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function parseName(filename) {
  const base = filename.replace(/\.txt$/i, "");
  const m = base.match(/^\s*(\d+)\s*[-\u2013\u2014.]\s*(.+)$/);
  if (m) {
    return { order: parseInt(m[1], 10), num: String(parseInt(m[1], 10)), title: m[2].trim(), file: filename, parts: [] };
  }
  return { order: 1e9, num: "", title: base, file: filename, parts: [] };
}

// Gom "<ten>.txt" + "<ten>.part2.txt" + ... thanh 1 chuong.
function buildChapters(names) {
  const bases = [];
  const partsMap = {};

  names.forEach(function (n) {
    const m = n.match(PART_RE);
    if (m) {
      const key = m[1] + ".txt";
      if (!partsMap[key]) partsMap[key] = [];
      partsMap[key].push({ n: parseInt(m[2], 10), file: n });
    } else {
      bases.push(n);
    }
  });

  return bases.map(function (n) {
    const chapter = parseName(n);
    const ps = (partsMap[n] || []).sort(function (a, b) { return a.n - b.n; });
    chapter.parts = ps.map(function (p) { return p.file; });
    return chapter;
  });
}

async function fetchFromApi() {
  const url =
    "https://api.github.com/repos/" + CFG.owner + "/" + CFG.repo +
    "/contents/" + CFG.apiDir + "?ref=" + CFG.branch;
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!res.ok) throw new Error("API " + res.status);
  const items = await res.json();
  const names = items
    .filter(function (i) { return i.type === "file" && /\.txt$/i.test(i.name); })
    .map(function (i) { return i.name; });
  return buildChapters(names);
}

async function fetchFromManifest() {
  const res = await fetch(CFG.localDir + "/index.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("khong co manifest");
  const names = await res.json();
  return buildChapters(names);
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

async function fetchOne(file) {
  const res = await fetch(CFG.localDir + "/" + encodeURIComponent(file), { cache: "no-cache" });
  if (!res.ok) throw new Error("Khong doc duoc chuong nay.");
  return res.text();
}

export async function getChapterText(chapter) {
  const first = typeof chapter === "string" ? chapter : chapter.file;
  const parts = typeof chapter === "string" ? [] : (chapter.parts || []);
  const files = [first].concat(parts);
  const texts = [];
  for (let i = 0; i < files.length; i++) {
    texts.push(await fetchOne(files[i]));
  }
  return texts.join("");
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

// ==== CỠ CHỮ (dùng chung) ====
const FS_MIN = 14, FS_MAX = 28, FS_DEFAULT = 19;

export function getFontSize() {
  const v = parseInt(localStorage.getItem("fontSize") || FS_DEFAULT, 10);
  return isNaN(v) ? FS_DEFAULT : Math.min(FS_MAX, Math.max(FS_MIN, v));
}

export function setFontSize(v) {
  const size = Math.min(FS_MAX, Math.max(FS_MIN, v));
  document.documentElement.style.setProperty("--fs", size + "px");
  localStorage.setItem("fontSize", size);
  return size;
}
