/**
 * Fetch a job posting link and pull out its text.
 *
 * Shared by the /jobapply/job route (the page's "Job link" field) and the jobapply MCP
 * server (mcp/jobapply/server.mjs), so it stays plain JS with no dependencies.
 * Prefers the schema.org JobPosting JSON-LD most ATS pages embed (Greenhouse, Lever,
 * Ashby, LinkedIn's public view); falls back to the page's visible text.
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_TEXT = 20000;
const MIN_TEXT = 200;
const MAX_REDIRECTS = 5;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/** An error whose message is safe and useful to show the user. */
export class JobFetchError extends Error {}

/**
 * @param {string} link
 * @returns {Promise<{ url: string, title: string, company: string, location: string, text: string, source: "json-ld" | "page" }>}
 */
export async function fetchJobPosting(link) {
  let url;
  try {
    url = new URL(String(link).trim());
  } catch {
    throw new JobFetchError("That isn't a valid link.");
  }

  let res;
  for (let hop = 0; ; hop++) {
    await assertPublic(url);
    try {
      res = await fetch(url, {
        redirect: "manual",
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.9" },
        signal: AbortSignal.timeout(12000),
      });
    } catch {
      throw new JobFetchError(`Couldn't reach ${url.hostname}.`);
    }
    const next = res.status >= 300 && res.status < 400 && res.headers.get("location");
    if (!next) break;
    if (hop >= MAX_REDIRECTS) throw new JobFetchError("That link redirects too many times.");
    url = new URL(next, url);
  }

  if (!res.ok) throw new JobFetchError(`${url.hostname} answered ${res.status}. It may need a login; paste the description instead.`);
  const type = res.headers.get("content-type") || "";
  if (type && !/html|text|json|xml/i.test(type)) throw new JobFetchError("That link isn't a web page.");

  const posting = extractJobPosting(await readCapped(res));
  if (posting.text.length < MIN_TEXT) {
    throw new JobFetchError(`Couldn't find the posting text on ${url.hostname} (it probably loads with JavaScript or needs a login). Paste the description instead.`);
  }
  return { url: url.href, ...posting };
}

/** @param {string} html */
export function extractJobPosting(html) {
  const pageTitle = decode(metaContent(html, "og:title") || (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
  const job = findJobPosting(html);
  if (job && typeof job.description === "string" && job.description.trim()) {
    return {
      title: clean(job.title) || pageTitle,
      company: clean(orgName(job.hiringOrganization)) || clean(metaContent(html, "og:site_name")),
      location: jobLocation(job),
      text: htmlToText(job.description).slice(0, MAX_TEXT),
      source: /** @type {const} */ ("json-ld"),
    };
  }
  const body = (html.match(/<main[\s\S]*?<\/main>/i) || html.match(/<body[\s\S]*<\/body>/i) || [html])[0];
  return {
    title: pageTitle,
    company: clean(metaContent(html, "og:site_name")),
    location: "",
    text: htmlToText(body).slice(0, MAX_TEXT),
    source: /** @type {const} */ ("page"),
  };
}

// ---------- network ----------
function isPrivate(ip) {
  const v = ip.toLowerCase();
  if (v.includes(":")) {
    if (v.startsWith("::ffff:")) return isPrivate(v.slice(7));
    return v === "::" || v === "::1" || /^f[cd]/.test(v) || v.startsWith("fe80");
  }
  const [a, b] = v.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

/** Refuse non-web schemes and hosts that resolve to private or local addresses. */
async function assertPublic(url) {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new JobFetchError("Only http and https links work.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let addrs;
  if (isIP(host)) addrs = [host];
  else {
    try {
      addrs = (await lookup(host, { all: true })).map((a) => a.address);
    } catch {
      throw new JobFetchError(`Couldn't find ${host}.`);
    }
  }
  if (!addrs.length || addrs.some(isPrivate)) throw new JobFetchError("That link points at a private network address.");
}

async function readCapped(res) {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BYTES) { await reader.cancel(); break; }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

// ---------- JSON-LD ----------
function findJobPosting(html) {
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    let data;
    try { data = JSON.parse(m[1].trim()); } catch { continue; }
    const found = walk(data);
    if (found) return found;
  }
  return null;
}

function walk(node) {
  if (Array.isArray(node)) {
    for (const n of node) { const f = walk(n); if (f) return f; }
    return null;
  }
  if (!node || typeof node !== "object") return null;
  const type = node["@type"];
  if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) return node;
  return node["@graph"] ? walk(node["@graph"]) : null;
}

function orgName(org) {
  if (!org) return "";
  if (typeof org === "string") return org;
  if (Array.isArray(org)) return orgName(org[0]);
  return org.name || "";
}

function jobLocation(job) {
  const remote = /TELECOMMUTE/i.test(String(job.jobLocationType || "")) ? "Remote" : "";
  const locs = (Array.isArray(job.jobLocation) ? job.jobLocation : job.jobLocation ? [job.jobLocation] : [])
    .map((l) => {
      const a = (l && l.address) || {};
      if (typeof a === "string") return a;
      return [a.addressLocality, a.addressRegion, a.addressCountry && typeof a.addressCountry === "object" ? a.addressCountry.name : a.addressCountry]
        .filter(Boolean).join(", ");
    })
    .filter(Boolean);
  return clean([...new Set(locs)].slice(0, 3).concat(remote ? [remote] : []).join("; "));
}

// ---------- text ----------
function metaContent(html, prop) {
  const p = prop.replace(/[.:]/g, "\\$&");
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]*content=["']([^"']*)["']`, "i")) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${p}["']`, "i"));
  return m ? decode(m[1]) : "";
}

const clean = (s) => decode(String(s || "")).replace(/\s+/g, " ").trim();

const NAMED = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  ndash: "–", mdash: "—", hellip: "…", bull: "•", middot: "·", trade: "™", reg: "®", copy: "©",
};

function decode(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

/** @param {string} html */
export function htmlToText(html) {
  let s = String(html);
  // JSON-LD descriptions are often HTML that was escaped once more.
  if (/&lt;\/?[a-z]/i.test(s)) s = decode(s);
  s = s
    .replace(/<(script|style|noscript|svg|head|nav|footer|template|iframe)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<li\b[^>]*>/gi, "\n• ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|tr|section|article|header|blockquote)>/gi, "\n")
    .replace(/<(p|div|h[1-6]|ul|ol|tr|section|article)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decode(s)
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n(•\s*\n)+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
