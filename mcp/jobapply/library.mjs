/**
 * Local knowledge store of past resumes, project-bank entries and job postings, used to
 * tailor new resumes. Everything lives in library/ next to this file (gitignored).
 *
 * Retrieval is hybrid: BM25 over chunk text fused (reciprocal rank) with cosine
 * similarity of all-MiniLM-L6-v2 embeddings computed locally with transformers.js.
 * If the model can't load (offline on first use), search falls back to BM25 alone.
 *
 * Facts on a resume must come from the project bank and profile.json; past resumes are
 * here for structure, phrasing and what was emphasized for which kind of job.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const LIBRARY_DIR = path.resolve(process.env.JOBAPPLY_LIBRARY_DIR || path.join(HERE, "library"));
const INDEX_FILE = path.join(LIBRARY_DIR, "index.json");
const FILES_DIR = path.join(LIBRARY_DIR, "files");
const MODEL = "Xenova/all-MiniLM-L6-v2";
const VERSION = 1;

// ---------- index persistence ----------
let cache = null;

async function load() {
  if (cache) return cache;
  cache = existsSync(INDEX_FILE) ? JSON.parse(await readFile(INDEX_FILE, "utf8")) : { version: VERSION, docs: [], chunks: [], projectsStamp: null };
  return cache;
}

async function save() {
  await mkdir(LIBRARY_DIR, { recursive: true });
  await writeFile(INDEX_FILE, JSON.stringify(cache), "utf8");
}

// ---------- embeddings ----------
let embedder = null;
let embedderFailed = null;

async function getEmbedder() {
  if (embedder || embedderFailed) return embedder;
  try {
    const { pipeline, env } = await import("@huggingface/transformers");
    env.cacheDir = path.join(LIBRARY_DIR, "models");
    embedder = await pipeline("feature-extraction", MODEL, { dtype: "fp32" });
  } catch (err) {
    embedderFailed = err.message;
  }
  return embedder;
}

/** Normalized 384-d vectors, or nulls when the model is unavailable. */
async function embed(texts) {
  const e = await getEmbedder();
  if (!e || !texts.length) return texts.map(() => null);
  const out = [];
  for (let i = 0; i < texts.length; i += 32) {
    const t = await e(texts.slice(i, i + 32), { pooling: "mean", normalize: true });
    for (const row of t.tolist()) out.push(row.map((v) => Math.round(v * 1e4) / 1e4));
  }
  return out;
}

const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
function meanVec(vecs) {
  const vs = vecs.filter(Boolean);
  if (!vs.length) return null;
  const m = vs[0].map((_, i) => vs.reduce((s, v) => s + v[i], 0) / vs.length);
  const n = Math.hypot(...m) || 1;
  return m.map((v) => v / n);
}

// ---------- BM25 ----------
const STOP = new Set("a an and are as at be by for from has in into is it its of on or that the to was were with via using used use our your their this these those than then so such".split(" "));
export const tokenize = (s) => String(s).toLowerCase().split(/[^a-z0-9+#.]+/).map((t) => t.replace(/^\.+|\.+$/g, "")).filter((t) => t.length > 1 && !STOP.has(t));

function bm25(query, docs, k1 = 1.4, b = 0.75) {
  const q = [...new Set(tokenize(query))];
  const toks = docs.map((d) => tokenize(d));
  const avg = toks.reduce((s, t) => s + t.length, 0) / (toks.length || 1);
  const df = new Map();
  for (const t of toks) for (const w of new Set(t)) df.set(w, (df.get(w) || 0) + 1);
  return toks.map((t) => {
    const tf = new Map();
    for (const w of t) tf.set(w, (tf.get(w) || 0) + 1);
    let s = 0;
    for (const w of q) {
      const f = tf.get(w);
      if (!f) continue;
      const idf = Math.log(1 + (docs.length - df.get(w) + 0.5) / (df.get(w) + 0.5));
      s += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * t.length) / avg)));
    }
    return s;
  });
}

/** Reciprocal-rank fusion of several score arrays over the same items. */
function rrf(scoreLists, k = 60) {
  const fused = new Array(scoreLists[0].length).fill(0);
  for (const scores of scoreLists) {
    const order = scores.map((s, i) => [s, i]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]);
    order.forEach(([, i], rank) => (fused[i] += 1 / (k + rank + 1)));
  }
  return fused;
}

// ---------- parsing resumes into sections, entries and bullets ----------
const SECTION = /^(education|experience|work experience|professional experience|projects?( & hackathons)?|[a-z ]*projects|technical skills|skills|leadership|activities|awards|certifications|publications)$/i;
const DATE_TAIL = /((jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+)?(19|20)\d\d\s*$|present\s*$/i;
const BULLET = /^[•▪●◦\-–*]\s*/;
const VERB = /^(built|led|ran|cut|won|wrote|made|grew|drove|set|took|owned|shipped|[A-Za-z]+ed)\b/i;

/** LaTeX resume -> marked-up plain text the line parser understands. */
function texToText(src) {
  const body = src.slice(src.indexOf("\\begin{document}") + 1 || 0).replace(/(^|[^\\])%.*$/gm, "$1");
  // Read one {...} group starting at i (which must be "{"); returns [content, nextIndex].
  const group = (s, i) => {
    let depth = 0;
    for (let j = i; j < s.length; j++) {
      if (s[j] === "\\") { j++; continue; }
      if (s[j] === "{") depth++;
      else if (s[j] === "}" && --depth === 0) return [s.slice(i + 1, j), j + 1];
    }
    return [s.slice(i + 1), s.length];
  };
  const args = (s, i, n) => {
    const out = [];
    for (let k = 0; k < n; k++) {
      while (i < s.length && /\s/.test(s[i])) i++;
      if (s[i] !== "{") break;
      const [g, next] = group(s, i);
      out.push(g);
      i = next;
    }
    return [out, i];
  };
  let out = "";
  for (let i = 0; i < body.length; ) {
    const m = body.slice(i).match(/^\\(section|resumeSubheading|resumeProjectHeading|resumeItem)\b/);
    if (!m) { out += body[i++]; continue; }
    i += m[0].length;
    if (m[1] === "section") { const [[t], n] = args(body, i, 1); out += `\n## ${t}\n`; i = n; }
    else if (m[1] === "resumeSubheading") { const [a, n] = args(body, i, 4); out += `\n${a[0]} ${a[1]}\n${a[2]} ${a[3]}\n`; i = n; }
    else if (m[1] === "resumeProjectHeading") { const [a, n] = args(body, i, 2); out += `\n${a[0]} ${a[1]}\n`; i = n; }
    else { const [[t], n] = args(body, i, 1); out += `\n• ${t}\n`; i = n; }
  }
  return out
    .replace(/\\(begin|end)\{[^}]*\}(\[[^\]]*\])?/g, "")
    .replace(/\\href\{[^}]*\}/g, "")
    .replace(/\$\|\$/g, "|")
    .replace(/\\\\/g, "\n")
    .replace(/\\(&|%|\$|#|_)/g, "$1")
    .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?/g, "")
    .replace(/[{}]/g, "")
    .replace(/---/g, "—").replace(/--/g, "–").replace(/``|''/g, '"')
    .replace(/[ \t]+/g, " ");
}

function htmlToText(html) {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n$1\n")
    .replace(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi, (_, t) => `\n## ${t}\n`)
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<(br|\/div|\/p|\/li|\/ul)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#39;|&rsquo;/g, "’").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ");
}

async function pdfToText(file) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(await readFile(file)));
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  return { text, pages: totalPages };
}

/**
 * Split resume text into header + sections of entries with bullets. Handles bullet glyphs,
 * glyph-less PDFs (a new bullet starts with a past-tense verb) and "## Heading" markers.
 */
export function parseResume(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const glyphs = lines.some((l) => BULLET.test(l) && !/^[-–]/.test(l));
  const titleCase = (s) => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
  const header = [];
  const sections = [];
  let sec = null, entry = null;
  const newEntry = (heading) => { entry = { heading, subtitle: "", bullets: [] }; sec.entries.push(entry); };
  const isEntryHeading = (s) => (DATE_TAIL.test(s) || / \| /.test(s)) && s.length < 140 && !VERB.test(s);

  for (const raw of lines) {
    const heading = raw.replace(/^##\s*/, "");
    if (raw.startsWith("##") || (raw.length < 40 && SECTION.test(heading))) {
      sec = { name: titleCase(heading), entries: [] };
      sections.push(sec);
      entry = null;
      continue;
    }
    if (!sec) { header.push(raw); continue; }

    // Skills: one entry per "Label: items" line, wrapped lines appended.
    if (/skill/i.test(sec.name)) {
      // PDFs sometimes emit an underlined project heading out of order, after everything
      // else; give it back to the project entry that was left with only a date.
      if (/ \| /.test(raw) && !raw.includes(":")) {
        const orphan = sections.flatMap((s) => s.entries).find((e) => /^\S+\.?\s+(19|20)\d\d$|^(19|20)\d\d$/.test(e.heading.trim()));
        if (orphan) { orphan.heading = `${raw} ${orphan.heading}`; continue; }
      }
      if (/^[^:]{2,40}:/.test(raw) || !sec.entries.length) newEntry(raw.replace(BULLET, ""));
      else entry.heading += " " + raw;
      continue;
    }

    const glyph = BULLET.test(raw);
    const textOnly = raw.replace(BULLET, "");
    if (!entry) { if (glyph) newEntry(""); else { newEntry(raw); continue; } }
    if (glyph) { entry.bullets.push(textOnly); continue; }
    // A dated/"|" line starts a new entry, unless it's the dated subtitle of an undated
    // heading ("University of Memphis Memphis, TN" / "B.S. ... Aug. 2023 – May 2027").
    if (isEntryHeading(raw) && (entry.bullets.length || entry.subtitle || DATE_TAIL.test(entry.heading))) { newEntry(raw); continue; }
    // First non-verb line under a heading is its subtitle (role, degree).
    if (!entry.bullets.length && !entry.subtitle && !VERB.test(raw) && (raw.length < 90 || DATE_TAIL.test(raw))) { entry.subtitle = raw; continue; }
    if (!entry.bullets.length) { entry.bullets.push(raw); continue; }
    // Without bullet glyphs, a capitalized past-tense verb starts a new bullet.
    if (!glyphs && /^[A-Z]/.test(raw) && VERB.test(raw)) { entry.bullets.push(raw); continue; }
    entry.bullets[entry.bullets.length - 1] += " " + raw;
  }
  return { header, sections };
}

/** Compact structure summary: section order, entries, bullet counts and lengths. */
export function outline(parsed) {
  const bullets = parsed.sections.flatMap((s) => s.entries.flatMap((e) => e.bullets));
  return {
    header: parsed.header,
    sections: parsed.sections.map((s) => ({
      name: s.name,
      entries: s.entries.map((e) => ({ heading: e.heading, subtitle: e.subtitle || undefined, bullets: e.bullets.length })),
    })),
    total_bullets: bullets.length,
    avg_bullet_chars: bullets.length ? Math.round(bullets.reduce((s, b) => s + b.length, 0) / bullets.length) : 0,
  };
}

// ---------- documents and chunks ----------
const docId = (...parts) => createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 10);

async function indexChunks(doc, chunks) {
  const idx = await load();
  idx.chunks = idx.chunks.filter((c) => c.doc !== doc.id);
  const vecs = await embed(chunks.map((c) => c.text));
  chunks.forEach((c, i) => idx.chunks.push({ doc: doc.id, ...c, vec: vecs[i] }));
  const [profileVec] = await embed([[doc.title, doc.role, doc.company, (doc.job_text || "").slice(0, 1500)].filter(Boolean).join(". ")]);
  doc.vec = meanVec([profileVec, meanVec(vecs)]);
  if (doc.job_text) [doc.job_vec] = await embed([doc.job_text.slice(0, 2000)]);
  idx.docs = idx.docs.filter((d) => d.id !== doc.id);
  idx.docs.push(doc);
}

function resumeChunks(parsed) {
  const chunks = [];
  for (const s of parsed.sections) {
    for (const e of s.entries) {
      chunks.push({ section: s.name, entry: e.heading, kind: "heading", text: [e.heading, e.subtitle].filter(Boolean).join(" — ") });
      for (const b of e.bullets) chunks.push({ section: s.name, entry: e.heading, kind: "bullet", text: b });
    }
  }
  return chunks;
}

/**
 * Add (or replace) a resume. file: .pdf, .tex, .html or .md/.txt. A copy is kept in
 * library/files so the index survives the original moving.
 */
export async function addResume({ file, company = "", role = "", job_text = "", style_reference = false, label = "" }) {
  const abs = path.resolve(file);
  if (!existsSync(abs)) throw new Error(`No file at ${abs}`);
  const ext = path.extname(abs).toLowerCase();
  let text, pages = null, tex = null;
  if (ext === ".pdf") ({ text, pages } = await pdfToText(abs));
  else {
    const raw = await readFile(abs, "utf8");
    if (ext === ".tex") { tex = raw; text = texToText(raw); }
    else if (ext === ".html" || ext === ".htm") text = htmlToText(raw);
    else text = raw;
  }
  const parsed = parseResume(text);
  if (!parsed.sections.length) throw new Error(`Couldn't find resume sections (Education, Experience, Projects, Skills) in ${abs}`);
  const idx = await load();
  if (style_reference) for (const d of idx.docs) d.style_reference = false;
  await mkdir(FILES_DIR, { recursive: true });
  const id = docId("resume", path.basename(abs), company, role);
  const stored = path.join(FILES_DIR, `${id}${ext}`);
  if (path.resolve(stored) !== abs) await copyFile(abs, stored);
  const doc = {
    id, type: "resume",
    title: label || path.basename(abs, ext),
    company, role, source: abs, file: stored, pages,
    style_reference: Boolean(style_reference),
    added: new Date().toISOString(),
    outline: outline(parsed),
    tex: tex || undefined,
    job_text: job_text || undefined,
  };
  await indexChunks(doc, resumeChunks(parsed));
  await save();
  return summary(doc, idx);
}

/** Re-index the project bank when it changed since last time (by count + latest updatedAt). */
export async function syncProjects(list) {
  const idx = await load();
  const live = list.filter((p) => !p.example);
  const stamp = `${live.length}:${Math.max(0, ...live.map((p) => p.updatedAt || 0))}`;
  if (idx.projectsStamp === stamp) return false;
  const keep = new Set(live.map((p) => "project:" + p.id));
  for (const d of idx.docs.filter((d) => d.type === "project" && !keep.has(d.id))) {
    idx.chunks = idx.chunks.filter((c) => c.doc !== d.id);
  }
  idx.docs = idx.docs.filter((d) => d.type !== "project" || keep.has(d.id));
  for (const p of live) {
    const id = "project:" + p.id;
    const existing = idx.docs.find((d) => d.id === id);
    if (existing && existing.updatedAt === p.updatedAt) continue;
    const doc = { id, type: "project", title: p.title, company: "", role: p.role || "", updatedAt: p.updatedAt, project_id: p.id, tech: p.tech };
    const chunks = [
      { section: "Projects", entry: p.title, kind: "summary", text: `${p.title}: ${p.summary} (${(p.tech || []).join(", ")})` },
      ...(p.bullets || []).map((b) => ({ section: "Projects", entry: p.title, kind: "bullet", text: b })),
    ];
    await indexChunks(doc, chunks);
  }
  idx.projectsStamp = stamp;
  await save();
  return true;
}

/** Store a job posting so later postings can be matched to the resume written for it. */
export async function addJob({ company, role, url = "", text }) {
  const idx = await load();
  const id = docId("job", company, role, url);
  const doc = { id, type: "job", title: `${role} — ${company}`, company, role, url, added: new Date().toISOString(), job_text: text };
  const paras = text.split(/\n\s*\n|\n(?=[A-Z][^\n]{0,60}\n)/).map((s) => s.trim()).filter((s) => s.length > 40).slice(0, 40);
  await indexChunks(doc, paras.map((t) => ({ section: "Posting", entry: doc.title, kind: "posting", text: t.slice(0, 600) })));
  await save();
  return { id, title: doc.title };
}

export async function linkResumeToJob(resumeId, jobText) {
  const idx = await load();
  const doc = idx.docs.find((d) => d.id === resumeId);
  if (!doc || !jobText) return;
  doc.job_text = jobText;
  [doc.job_vec] = await embed([jobText.slice(0, 2000)]);
  await save();
}

/** Hybrid search over chunks. */
export async function search(query, { k = 8, type, section } = {}) {
  const idx = await load();
  const docs = new Map(idx.docs.map((d) => [d.id, d]));
  const pool = idx.chunks.filter((c) => (!type || docs.get(c.doc)?.type === type) && (!section || c.section.toLowerCase().includes(section.toLowerCase())));
  if (!pool.length) return [];
  const lex = bm25(query, pool.map((c) => `${c.text} ${c.entry}`));
  const [qv] = await embed([query]);
  const lists = [lex];
  if (qv) lists.push(pool.map((c) => (c.vec ? Math.max(0, dot(qv, c.vec)) : 0)));
  const fused = rrf(lists);
  const seen = new Set();
  return fused
    .map((score, i) => ({ score, c: pool[i] }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .filter(({ c }) => !seen.has(c.text) && seen.add(c.text))
    .slice(0, k)
    .map(({ score, c }) => {
      const d = docs.get(c.doc);
      return { text: c.text, section: c.section, entry: c.entry, source: d.title, type: d.type, company: d.company || undefined, role: d.role || undefined, score: Math.round(score * 1e4) / 1e4 };
    });
}

/** Past resumes closest to a job posting, best first, plus the pinned style reference. */
export async function similarResumes(jobText, k = 2) {
  const idx = await load();
  const resumes = idx.docs.filter((d) => d.type === "resume");
  if (!resumes.length) return { style_reference: null, similar: [] };
  const [jv] = await embed([jobText.slice(0, 2000)]);
  const meta = resumes.map((d) => [d.title, d.company, d.role, d.job_text || "", ...d.outline.sections.flatMap((s) => s.entries.map((e) => e.heading))].join(" "));
  const lex = bm25(jobText.slice(0, 4000), meta);
  const lists = [lex];
  if (jv) lists.push(resumes.map((d) => Math.max(d.vec ? dot(jv, d.vec) : 0, d.job_vec ? dot(jv, d.job_vec) : 0)));
  const fused = rrf(lists);
  const ranked = resumes.map((d, i) => ({ d, s: fused[i] })).sort((a, b) => b.s - a.s);
  const view = ({ d, s }) => ({ id: d.id, title: d.title, company: d.company || undefined, role: d.role || undefined, score: s === undefined ? undefined : Math.round(s * 1e4) / 1e4, outline: d.outline, tex: d.tex });
  const ref = resumes.find((d) => d.style_reference);
  return {
    style_reference: ref ? view({ d: ref }) : null,
    similar: ranked.filter(({ d }) => d !== ref).slice(0, k).map(view),
  };
}

function summary(d, idx) {
  return {
    id: d.id, type: d.type, title: d.title, company: d.company || undefined, role: d.role || undefined,
    style_reference: d.style_reference || undefined, source: d.source, pages: d.pages ?? undefined,
    chunks: idx.chunks.filter((c) => c.doc === d.id).length,
    sections: d.outline?.sections.map((s) => `${s.name} (${s.entries.length})`).join(", "),
  };
}

export async function listLibrary() {
  const idx = await load();
  const embedded = idx.chunks.filter((c) => c.vec).length;
  return {
    dir: LIBRARY_DIR,
    retrieval: embedderFailed ? `BM25 only (embedding model unavailable: ${embedderFailed})` : "hybrid BM25 + MiniLM embeddings",
    chunks: idx.chunks.length,
    chunks_embedded: embedded,
    resumes: idx.docs.filter((d) => d.type === "resume").map((d) => summary(d, idx)),
    jobs: idx.docs.filter((d) => d.type === "job").map((d) => ({ id: d.id, title: d.title, url: d.url || undefined })),
    projects: idx.docs.filter((d) => d.type === "project").length,
  };
}

export async function removeDoc(id) {
  const idx = await load();
  const d = idx.docs.find((x) => x.id === id);
  if (!d) throw new Error(`No library document with id ${id}. Use list_library to see ids.`);
  idx.docs = idx.docs.filter((x) => x.id !== id);
  idx.chunks = idx.chunks.filter((c) => c.doc !== id);
  await save();
  return { removed: id, title: d.title };
}
