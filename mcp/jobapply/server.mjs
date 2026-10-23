#!/usr/bin/env node
/**
 * jobapply MCP server: adds and edits projects on rahulmoka.com/jobapply.
 *
 * The page's server data is private/jobapply/projects.json on origin/master. This
 * server keeps its own detached git worktree of the portfolio repo (JOBAPPLY_REPO),
 * resets it to origin/master before every read and write, and publishes by
 * committing that one file and pushing to master, which redeploys the site on Vercel.
 * It never touches your normal checkout.
 *
 * It also tailors resumes: fetch_job reads a posting link, and write_resume renders a
 * LaTeX resume from profile.json plus chosen projects into a folder on the Desktop.
 * library.mjs keeps a local, searchable store of past resumes, projects and postings so
 * new resumes can reuse the structure and phrasing of ones that worked.
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { completable } from "@modelcontextprotocol/sdk/server/completable.js";
import { z } from "zod";
import { fetchJobPosting } from "../../src/lib/jobPosting.mjs";
import { renderResume, saveResume } from "./resume.mjs";
import { addJob, addResume, listLibrary, removeDoc, search, similarResumes, syncProjects } from "./library.mjs";

const run = promisify(execFile);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(process.env.JOBAPPLY_REPO || path.join(HERE, "..", "..", "..", "portfolio-mcp"));
const REMOTE = process.env.JOBAPPLY_REMOTE || "origin";
const BRANCH = process.env.JOBAPPLY_BRANCH || "master";
const SITE_URL = "https://rahulmoka.com/jobapply";
const DATA_FILE = "private/jobapply/projects.json";
const DESKTOP = path.join(os.homedir(), "Desktop");
// Where project repos live locally, and where tailored resumes go.
const PROJECTS_DIR = path.resolve(process.env.JOBAPPLY_PROJECTS_DIR || DESKTOP);
const RESUME_DIR = path.resolve(process.env.JOBAPPLY_RESUME_DIR || path.join(DESKTOP, "Resumes"));
const PROFILE_FILE = path.join(HERE, "profile.json");

// Keep in sync with CATEGORIES / TYPES in private/jobapply/page.html.
const CATEGORIES = ["Frontend", "Backend", "Full-Stack", "Mobile", "Data Analysis", "Machine Learning / AI", "Data Engineering", "Cloud & DevOps", "Other"];
const TYPES = ["Personal", "Academic", "Work", "Internship", "Hackathon", "Open Source", "Freelance"];
// Key order used by the existing file, so diffs stay small.
const KEY_ORDER = ["bullets", "category", "createdAt", "dates", "example", "link", "role", "summary", "tech", "title", "type", "updatedAt", "id"];

// ---------- git ----------
async function git(args, cwd = REPO) {
  const { stdout } = await run("git", args, { cwd, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
  return stdout.trim();
}

async function ensureWorktree() {
  if (existsSync(path.join(REPO, ".git"))) return;
  // Create it from the repo this server lives in.
  const source = await git(["rev-parse", "--show-toplevel"], HERE);
  await git(["fetch", REMOTE, BRANCH], source);
  await git(["worktree", "add", "--detach", REPO, `${REMOTE}/${BRANCH}`], source);
}

/** Reset the private worktree to exactly what the live site deploys from. */
async function sync() {
  await ensureWorktree();
  await git(["fetch", REMOTE, BRANCH]);
  await git(["checkout", "--force", "--detach", `${REMOTE}/${BRANCH}`]);
}

// Tool calls can overlap; git work in the shared worktree must not.
let queue = Promise.resolve();
function exclusive(fn) {
  const next = queue.then(fn, fn);
  queue = next.catch(() => {});
  return next;
}

// ---------- data ----------
async function readProjects() {
  const raw = await readFile(path.join(REPO, DATA_FILE), "utf8");
  return { list: JSON.parse(raw), eol: raw.includes("\r\n") ? "\r\n" : "\n", trailing: /\r?\n$/.test(raw) };
}

async function writeProjects({ list, eol, trailing }) {
  let out = JSON.stringify(list.map(ordered), null, 2).replace(/\n/g, eol);
  if (trailing) out += eol;
  await writeFile(path.join(REPO, DATA_FILE), out, "utf8");
}

function ordered(p) {
  const out = {};
  for (const k of KEY_ORDER) if (k in p) out[k] = p[k];
  for (const k of Object.keys(p)) if (!(k in out)) out[k] = p[k];
  return out;
}

const slugify = (s) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9+#.]/g, "");

/** Skill tags with counts, most used first. */
function skillVocab(list) {
  const counts = new Map();
  for (const p of list) for (const t of p.tech || []) counts.set(t, (counts.get(t) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** Trim, dedupe, and reuse the existing spelling of a tag ("claude api" -> "Claude API"). */
function cleanTech(tech, list) {
  const known = new Map(skillVocab(list).map(([t]) => [norm(t), t]));
  const seen = new Set();
  const out = [];
  for (const raw of tech) {
    const t = String(raw).trim();
    if (!t) continue;
    const key = norm(t);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(known.get(key) || t);
  }
  return out;
}

const cleanLines = (arr) => arr.map((s) => String(s).replace(/^\s*[•\-*]\s*/, "").trim()).filter(Boolean);

function findProject(list, query) {
  const q = String(query).trim();
  const exact = list.find((p) => p.id === q) || list.find((p) => p.title.toLowerCase() === q.toLowerCase());
  if (exact) return exact;
  const words = q.toLowerCase().split(/\W+/).filter((w) => w.length > 1);
  let best = null, bestScore = 0;
  for (const p of list) {
    const hay = (p.title + " " + p.id + " " + p.summary).toLowerCase();
    const score = words.filter((w) => hay.includes(w)).length;
    if (score > bestScore) { best = p; bestScore = score; }
  }
  return bestScore >= Math.max(1, Math.ceil(words.length / 2)) ? best : null;
}

/** The project's folder under PROJECTS_DIR, found by its repo name or id, if it exists. */
function localPath(p) {
  const repo = (String(p.link || "").match(/github\.com\/[^/]+\/([^/?#]+)/i) || [])[1];
  for (const name of [repo && repo.replace(/\.git$/, ""), p.id]) {
    if (name && existsSync(path.join(PROJECTS_DIR, name))) return path.join(PROJECTS_DIR, name);
  }
  return null;
}

// profile.json holds contact details, so it's gitignored and lives only on this machine.
async function loadProfile() {
  const raw = await readFile(PROFILE_FILE, "utf8").catch(() => {
    throw new Error(`Missing ${PROFILE_FILE}: the base resume (name, contact, education, experience, skills). See README.md.`);
  });
  return JSON.parse(raw);
}

/**
 * Apply `mutate` to a fresh copy of the data, commit, and push. If the push loses a
 * race with another commit, start again from the new origin/master once.
 */
async function publish(mutate, message, dryRun) {
  return exclusive(async () => {
    for (let attempt = 1; ; attempt++) {
      await sync();
      const data = await readProjects();
      const result = mutate(data.list);
      if (dryRun) return { ...result, published: false, note: "Dry run: nothing was written or pushed." };
      await writeProjects(data);
      await git(["add", DATA_FILE]);
      await git(["commit", "-m", typeof message === "function" ? message(result) : message, "--", DATA_FILE]);
      const sha = await git(["rev-parse", "--short", "HEAD"]);
      try {
        await git(["push", REMOTE, `HEAD:${BRANCH}`]);
      } catch (err) {
        if (attempt < 2 && /rejected|non-fast-forward|fetch first/i.test(String(err.stderr || err.message))) continue;
        throw new Error(`Committed ${sha} locally but the push failed: ${String(err.stderr || err.message).trim()}`);
      }
      return { ...result, published: true, commit: sha, url: SITE_URL, note: `Pushed to ${REMOTE}/${BRANCH}. Vercel redeploys in about a minute.` };
    }
  });
}

async function snapshot() {
  return exclusive(async () => {
    await sync();
    return (await readProjects()).list;
  });
}

// ---------- server ----------
const server = new McpServer(
  { name: "jobapply", version: "0.2.0" },
  {
    instructions:
      "Manages the project bank at rahulmoka.com/jobapply and tailors resumes from it. When the user gives a job (link, " +
      "description or both) and wants a resume or to apply, call start_tailor_resume first and follow the workflow it returns. " +
      "When the user asks to add, make or create a project, call " +
      "start_new_project first and follow the workflow it returns. When they ask to update, edit or add to a project, call " +
      "start_edit_project first. To remove a project, confirm with the user, then call delete_project. Writes push to the live site, so create_project, update_project and delete_project need the user's approval. " +
      "search_library and similar_resumes retrieve from past resumes and projects; add_resume stores a resume the user shares.",
  },
);

const text = (value) => ({ content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] });
const fail = (message) => ({ content: [{ type: "text", text: message }], isError: true });

const fields = {
  title: z.string().trim().min(1).max(120).describe("Project name as it should appear on the resume"),
  category: z.enum(CATEGORIES),
  type: z.enum(TYPES),
  summary: z.string().trim().min(1).max(300).describe("One sentence: what it is and what makes it notable"),
  bullets: z.array(z.string()).min(1).max(6).describe("Resume bullets, each an action verb plus a concrete result or metric"),
  tech: z.array(z.string()).min(1).max(20).describe("Skill tags; reuse the existing spelling from list_skills"),
  dates: z.string().trim().max(40).optional().describe('e.g. "Oct. 2026" or "Jan. 2026 – Mar. 2026"'),
  role: z.string().trim().max(80).optional().describe('e.g. "Solo developer"'),
  link: z.string().trim().max(300).optional().describe("Repo or demo URL"),
};

server.registerTool(
  "list_projects",
  {
    title: "List projects",
    description:
      "List every project on the jobapply page (id, title, category, type, dates, tech), as currently deployed, plus " +
      "local_path: the project's folder on this machine when one is found.",
    annotations: { readOnlyHint: true },
  },
  async () => {
    const list = await snapshot();
    return text(list.map(({ id, title, category, type, dates, tech, ...p }) => ({ id, title, category, type, dates, tech, local_path: localPath({ id, ...p }) })));
  },
);

server.registerTool(
  "get_project",
  {
    title: "Get project",
    description: "Full current data for one project, by id or title. Use it as the context before editing.",
    inputSchema: { project: z.string().min(1).describe("Project id or title") },
    annotations: { readOnlyHint: true },
  },
  async ({ project }) => {
    const list = await snapshot();
    const p = findProject(list, project);
    return p ? text({ ...p, local_path: localPath(p) }) : fail(`No project matches "${project}". Known ids: ${list.map((x) => x.id).join(", ")}`);
  },
);

server.registerTool(
  "list_skills",
  {
    title: "List skills",
    description: "Every skill tag used across projects with how many projects use it. Reuse these spellings when tagging.",
    annotations: { readOnlyHint: true },
  },
  async () => text(skillVocab(await snapshot()).map(([skill, projects]) => ({ skill, projects }))),
);

server.registerTool(
  "create_project",
  {
    title: "Create project",
    description:
      "Add a new project to rahulmoka.com/jobapply and push it live. Call start_new_project first. Only call this after interviewing the user about the " +
      "project and getting explicit approval of the complete draft (title, category, type, dates, role, link, summary, bullets, tech).",
    inputSchema: { ...fields, dry_run: z.boolean().optional().describe("Validate and preview without writing or pushing") },
    annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async ({ dry_run, ...input }) => {
    try {
      const res = await publish(
        (list) => {
          const id = slugify(input.title);
          if (!id) throw new Error("The title needs at least one letter or number.");
          const clash = list.find((p) => p.id === id || p.title.toLowerCase() === input.title.toLowerCase());
          if (clash) throw new Error(`"${clash.title}" (id ${clash.id}) already exists. Use update_project to change it.`);
          const now = Date.now();
          const project = {
            bullets: cleanLines(input.bullets),
            category: input.category,
            createdAt: now,
            dates: input.dates || "",
            example: false,
            link: input.link || "",
            role: input.role || "",
            summary: input.summary,
            tech: cleanTech(input.tech, list),
            title: input.title,
            type: input.type,
            updatedAt: now,
            id,
          };
          if (!project.bullets.length) throw new Error("Add at least one non-empty bullet.");
          list.unshift(project);
          return { action: "created", project };
        },
        `jobapply: add ${input.title}`,
        dry_run,
      );
      return text(res);
    } catch (err) {
      return fail(err.message);
    }
  },
);

server.registerTool(
  "update_project",
  {
    title: "Update project",
    description:
      "Change fields of an existing project on rahulmoka.com/jobapply and push it live. Call start_edit_project first. " +
      "Only the fields you pass change; arrays (bullets, tech) replace the old array whole, so send the full new list. " +
      "Confirm the exact change with the user before calling.",
    inputSchema: {
      project: z.string().min(1).describe("Project id or title"),
      ...Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v.optional()])),
      dry_run: z.boolean().optional().describe("Validate and preview without writing or pushing"),
    },
    annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: true },
  },
  async ({ project: query, dry_run, ...patch }) => {
    const changes = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    if (!Object.keys(changes).length) return fail("Pass at least one field to change.");
    try {
      const res = await publish(
        (list) => {
          const p = findProject(list, query);
          if (!p) throw new Error(`No project matches "${query}". Known ids: ${list.map((x) => x.id).join(", ")}`);
          if (changes.title && list.some((x) => x !== p && x.title.toLowerCase() === changes.title.toLowerCase())) {
            throw new Error(`Another project is already titled "${changes.title}".`);
          }
          const before = { ...p };
          if (changes.bullets) changes.bullets = cleanLines(changes.bullets);
          if (changes.tech) changes.tech = cleanTech(changes.tech, list.filter((x) => x !== p));
          Object.assign(p, changes, { updatedAt: Date.now() });
          const changed = Object.keys(changes).map((k) => ({ field: k, before: before[k], after: p[k] }));
          return { action: "updated", changed, project: p };
        },
        (r) => `jobapply: update ${r.project.title}`,
        dry_run,
      );
      return text(res);
    } catch (err) {
      return fail(err.message);
    }
  },
);

server.registerTool(
  "delete_project",
  {
    title: "Delete project",
    description:
      "Remove a project from rahulmoka.com/jobapply and push it live; its library entry is dropped on the next sync. " +
      "Show the user the project (get_project) and get explicit confirmation before calling. Profile experience entries " +
      "that link to it keep their own bullets.",
    inputSchema: {
      project: z.string().min(1).describe("Project id or title"),
      dry_run: z.boolean().optional().describe("Show what would be removed without writing or pushing"),
    },
    annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: true },
  },
  async ({ project: query, dry_run }) => {
    try {
      const res = await publish(
        (list) => {
          const p = findProject(list, query);
          if (!p) throw new Error(`No project matches "${query}". Known ids: ${list.map((x) => x.id).join(", ")}`);
          list.splice(list.indexOf(p), 1);
          return { action: "deleted", project: p };
        },
        (r) => `jobapply: delete ${r.project.title}`,
        dry_run,
      );
      if (res.published) await syncProjects(await snapshot()).catch(() => {});
      return text(res);
    } catch (err) {
      return fail(err.message);
    }
  },
);

// ---------- resumes ----------
server.registerTool(
  "fetch_job",
  {
    title: "Fetch job posting",
    description:
      "Read a job posting link (Greenhouse, Lever, Ashby, LinkedIn's public view, most company career pages) and return its " +
      "title, company, location and text. Pages that need a login or render with JavaScript (often Workday, some LinkedIn " +
      "links) fail; then ask the user to paste the description.",
    inputSchema: { url: z.string().trim().min(1).describe("The job posting URL") },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ url }) => {
    try {
      return text(await fetchJobPosting(url));
    } catch (err) {
      return fail(err.message);
    }
  },
);

const lines = (max, what) => z.array(z.string().trim().min(1).max(260)).min(1).max(max).describe(what);

server.registerTool(
  "write_resume",
  {
    title: "Write tailored resume",
    description:
      `Render a one-page LaTeX resume (EA layout) from my base profile plus the chosen projects, save it to ` +
      `${RESUME_DIR}/<Company> - <Role>/, and compile a PDF. Projects come from rahulmoka.com/jobapply as deployed; only ` +
      "pass bullets/tech/experience/skills to reword or reorder them for this job, never to add work that wasn't done. Wrap " +
      "key terms and metrics in **double asterisks** to bold them. Fails if the PDF runs past one page, returning the overflow " +
      "text so you can trim and call again. On success the resume (and job_text) is added to the library. Call only after the " +
      "user approves the draft. Rewrites the file if it exists.",
    inputSchema: {
      company: z.string().trim().min(1).max(80),
      role: z.string().trim().min(1).max(120).describe("Job title as posted"),
      job_url: z.string().trim().max(500).optional().describe("Posting link, noted at the top of the .tex"),
      job_text: z.string().max(20000).optional().describe("The posting text, stored in the library with this resume"),
      projects: z
        .array(
          z.object({
            project: z.string().min(1).describe("Project id or title"),
            bullets: lines(5, "This resume's bullets for the project; omit to use the bank's").optional(),
            tech: z.array(z.string().trim().min(1)).max(8).optional().describe("Tags shown in the heading, most relevant first; omit for the bank's first 6"),
          }),
        )
        .min(1)
        .max(5)
        .describe("In resume order, most relevant first"),
      experience: z
        .array(z.object({ company: z.string().min(1).describe("Matches a company in the profile"), bullets: lines(6, "Reworded bullets for this job") }))
        .optional()
        .describe("Only the jobs whose bullets change; the rest keep the profile's (or their linked bank project's)"),
      experience_order: z
        .array(z.string().min(1))
        .optional()
        .describe("Companies to include, in order; omit for every profile job not marked optional"),
      skills: z
        .array(z.object({ label: z.string().trim().min(1).max(40), items: z.string().trim().min(1).max(300) }))
        .min(1)
        .max(6)
        .optional()
        .describe("Replaces the Technical Skills lines; omit to keep the profile's"),
    },
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ company, role, job_url, job_text, projects, experience, experience_order, skills }) => {
    try {
      const [list, profile] = await Promise.all([snapshot(), loadProfile()]);
      const chosen = projects.map((sel) => {
        const p = findProject(list, sel.project);
        if (!p) throw new Error(`No project matches "${sel.project}". Known ids: ${list.map((x) => x.id).join(", ")}`);
        return { title: p.title, dates: p.dates, link: p.link, tech: sel.tech || (p.tech || []).slice(0, 6), bullets: sel.bullets || p.bullets || [] };
      });
      const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
      const companies = profile.experience.map((x) => x.company).join(", ");
      const unknown = [...(experience || []).map((e) => e.company), ...(experience_order || [])].filter((c) => !profile.experience.some((x) => same(x.company, c)));
      if (unknown.length) throw new Error(`No experience entry for ${unknown.map((c) => `"${c}"`).join(", ")}. Companies: ${companies}`);
      const included = experience_order
        ? experience_order.map((c) => profile.experience.find((x) => same(x.company, c)))
        : profile.experience.filter((x) => !x.optional);
      // Bullets: this call's rewrite, else the profile's, else the linked bank project's.
      const jobs = included.map((x) => {
        const edit = (experience || []).find((e) => same(e.company, x.company));
        const linked = x.project ? findProject(list, x.project) : null;
        return { ...x, bullets: edit?.bullets || x.bullets || linked?.bullets || [] };
      });

      const source = renderResume({
        profile,
        projects: chosen,
        experience: jobs,
        skills: skills || profile.skills,
        comment: [`Tailored for ${role} at ${company}`, job_url, `Generated by the jobapply MCP server on ${new Date().toISOString().slice(0, 10)}`].filter(Boolean).join("\n"),
      });
      const saved = await saveResume({ dir: RESUME_DIR, company, role, name: profile.name, source });
      const result = { ...saved, projects: chosen.map((p) => p.title) };
      if (saved.pages > 1) {
        return fail(`The resume is ${saved.pages} pages; it has to fit on one. Trim bullets, shorten wrapped lines or drop a project, then call write_resume again.\n\n` + JSON.stringify(result, null, 2));
      }
      if (saved.pdfPath) {
        // Remember what was sent for this kind of job; a library failure shouldn't fail the resume.
        try {
          const added = await addResume({ file: saved.texPath, company, role, job_text: job_text || "" });
          if (job_text) await addJob({ company, role, url: job_url || "", text: job_text });
          result.library = `Added to the library as ${added.id}.`;
        } catch (err) {
          result.library = `Not added to the library: ${err.message}`;
        }
      }
      return text(result);
    } catch (err) {
      return fail(err.message);
    }
  },
);

// ---------- library (RAG over past resumes, projects and postings) ----------
server.registerTool(
  "add_resume",
  {
    title: "Add resume to library",
    description:
      "Store a resume (.pdf, .tex, .html, .md or .txt) in the local library so tailoring can retrieve its structure and phrasing. " +
      "Pass the company/role it was written for and the posting text if known. style_reference: true makes it the layout every " +
      "new resume mimics (replacing the previous one).",
    inputSchema: {
      path: z.string().min(1).describe("Path to the resume file"),
      company: z.string().trim().max(80).optional(),
      role: z.string().trim().max(120).optional(),
      job_text: z.string().max(20000).optional().describe("The posting this resume was tailored to"),
      label: z.string().trim().max(120).optional().describe("Display name; defaults to the file name"),
      style_reference: z.boolean().optional(),
    },
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ path: file, ...opts }) => {
    try {
      return text(await addResume({ file, ...opts }));
    } catch (err) {
      return fail(err.message);
    }
  },
);

server.registerTool(
  "search_library",
  {
    title: "Search library",
    description:
      "Hybrid (BM25 + embedding) search over past resume bullets, project-bank entries and stored postings. Use it per job " +
      "requirement to find which project or bullet covers it and how it was phrased before. Facts must still match the bank.",
    inputSchema: {
      query: z.string().min(1),
      k: z.number().int().min(1).max(30).optional().describe("Results to return (default 8)"),
      type: z.enum(["resume", "project", "job"]).optional(),
      section: z.string().optional().describe('Filter by section name, e.g. "Experience", "Projects", "Skills"'),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ query, k, type, section }) => {
    try {
      await syncProjects(await snapshot());
      return text(await search(query, { k, type, section }));
    } catch (err) {
      return fail(err.message);
    }
  },
);

server.registerTool(
  "similar_resumes",
  {
    title: "Similar past resumes",
    description:
      "Given a job posting's text, return the pinned style-reference resume plus the past tailored resumes closest to that job " +
      "(section outline, and the .tex when stored), to mimic their structure and emphasis.",
    inputSchema: { job_text: z.string().min(20), k: z.number().int().min(1).max(5).optional() },
    annotations: { readOnlyHint: true },
  },
  async ({ job_text, k }) => {
    try {
      return text(await similarResumes(job_text, k || 2));
    } catch (err) {
      return fail(err.message);
    }
  },
);

server.registerTool(
  "list_library",
  {
    title: "List library",
    description: "What the resume library holds: resumes (with the style reference marked), stored postings and indexed projects.",
    annotations: { readOnlyHint: true },
  },
  async () => {
    try {
      await syncProjects(await snapshot());
      return text(await listLibrary());
    } catch (err) {
      return fail(err.message);
    }
  },
);

server.registerTool(
  "remove_resume",
  {
    title: "Remove from library",
    description: "Remove a resume or stored posting from the library by id (from list_library).",
    inputSchema: { id: z.string().min(1) },
    annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: false },
  },
  async ({ id }) => {
    try {
      return text(await removeDoc(id));
    } catch (err) {
      return fail(err.message);
    }
  },
);

// ---------- workflows: prompts (slash commands) and start_* tools ----------
const say = (body) => ({ messages: [{ role: "user", content: { type: "text", text: body } }] });

function styleExamples(list) {
  return list
    .filter((p) => !p.example && p.bullets?.length)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 2)
    .map((p) => JSON.stringify(ordered(p), null, 2))
    .join("\n\n");
}

// The workflows behind the slash commands; the start_* tools return the same text,
// so a plain request like "use jobapply to add this project" gets the full workflow too.
async function newProjectBrief(spec) {
  const list = await snapshot();
  const vocab = skillVocab(list).map(([t, n]) => `${t} (${n})`).join(", ");
  return `I want to add a new project to my resume project bank at ${SITE_URL}.

Work through this in order:

1. Enter plan mode now (call EnterPlanMode if you have it). Don't call create_project until step 5.
2. Read the spec below. If it is or mentions a local path or repo, read its README and enough of the code to know what was actually built, the stack, and any numbers worth citing.
3. Interview me about what the spec doesn't settle. Use AskUserQuestion if you have it (a few questions per round, with your best guess as the first option); otherwise ask in chat. Cover:
   - title, category, type, dates and my role
   - the repo or demo link
   - the real results and metrics behind each bullet. Never invent numbers; if I don't have one, describe the result without it.
4. Draft the full entry and present it for approval (via ExitPlanMode if you're in plan mode). The draft needs:
   - title, category, type, dates, role, link
   - summary: one sentence
   - bullets: exactly 3. Each starts with a strong past-tense verb, covers one concrete thing I did, and ends with the impact. Roughly one resume line each.
   - tech: 4–8 skill tags
5. When I approve, call create_project with the approved fields. Report the commit and that the site updates in about a minute.

Rules:
- category is one of: ${CATEGORIES.join(", ")}
- type is one of: ${TYPES.join(", ")}
- Tech tags: reuse the existing spelling where the skill already exists. Add a new tag only for genuinely new skills. Existing tags (with project counts): ${vocab}
- Projects already on the page (don't duplicate one): ${list.map((p) => p.title).join("; ")}

Two existing entries, for tone, length and format:
${styleExamples(list)}

The spec:
<spec>
${spec}
</spec>`;
}

async function editProjectBrief(project, request) {
  const list = await snapshot();
  const p = findProject(list, project);
  if (!p) {
    return `I asked to edit the jobapply project "${project}", but nothing matches it. Show me this list and ask which one I meant, then continue with my request: "${request}".

${list.map((x) => `- ${x.id}: ${x.title}`).join("\n")}`;
  }
  return `I want to edit a project in my resume project bank at ${SITE_URL}. Here is its current data, as currently deployed:

${JSON.stringify(ordered(p), null, 2)}

My request:
<request>
${request}
</request>

1. If the request points at a local repo or new work, read what you need to get the facts right. If something important is unclear (for example, a metric), ask me instead of guessing.
2. Show me exactly which fields change, before and after. Keep the existing bullet style: strong past-tense verb, concrete work, then impact, roughly one line each. Never invent numbers.
3. For new skills, reuse existing tag spellings where they exist. Current tags: ${skillVocab(list).map(([t]) => t).join(", ")}
4. Once I confirm, call update_project with project "${p.id}" and only the changed fields. bullets and tech replace the whole array, so send the full new list. Then report the commit.`;
}

/** Style reference + closest past resumes for this job, as text for the brief. */
async function libraryContext(job) {
  try {
    let jobText = job;
    const url = (job.match(/https?:\/\/\S+/) || [])[0];
    if (url && job.replace(url, "").trim().length < 200) {
      jobText = await fetchJobPosting(url).then((j) => [j.title, j.company, j.text].filter(Boolean).join("\n")).catch(() => job);
    }
    const { style_reference: ref, similar } = await similarResumes(jobText, 2);
    if (!ref && !similar.length) return "The resume library is empty. Add past resumes with add_resume so tailoring can learn from them.";
    const out = [];
    if (ref) {
      out.push(`Style reference ("${ref.title}"). Mirror its section order, entry shape, bullet counts and density:\n${JSON.stringify(ref.outline, null, 2)}`);
    }
    for (const s of similar) {
      out.push(`Past resume for a similar job: "${s.title}"${s.company ? ` (${s.role || ""} at ${s.company})` : ""}, similarity ${s.score}. Note what it led with and emphasized:\n${JSON.stringify(s.outline, null, 2)}`);
    }
    return out.join("\n\n");
  } catch (err) {
    return `(Library unavailable: ${err.message})`;
  }
}

async function tailorBrief(job) {
  const [list, profile] = await Promise.all([snapshot(), loadProfile()]);
  await syncProjects(list).catch(() => {});
  const projects = list.filter((p) => !p.example).map((p) => ({ ...ordered(p), local_path: localPath(p) }));
  const library = await libraryContext(job);
  const linked = new Set(profile.experience.map((x) => x.project).filter(Boolean));
  return `I want a resume tailored to a job, built from my project bank at ${SITE_URL}.

The job (a link, a pasted description, or both):
<job>
${job}
</job>

Work through this in order:

1. Get the posting. For each link above, call fetch_job. If it fails or returns little of the posting (LinkedIn and Workday often do), ask me to paste the description. If I gave both a link and text, use both; my pasted text wins where they differ.
2. Pull out the company, the role, and the must-have and nice-to-have requirements (languages, frameworks, tools, domain, seniority). Show me a short summary.
3. Match my projects and experience (below) against it. Call search_library for each must-have to find the bullets that cover it (and how past resumes phrased them). For each must-have, name the project or job that covers it, or say nothing does.
4. Pick a path and ask me to confirm it (AskUserQuestion if you have it, your recommendation first):
   A. Resume now: my projects already cover the core requirements.
   B. Extend a project first: a must-have gap that one of my projects could genuinely cover with a focused addition. Name the project, its local_path, and the exact feature. Only offer this for projects with a local_path.
   C. New project first: a must-have gap that no project comes close to. Propose a small project scoped to it: what it does, the stack, and roughly how long it takes.
   When you recommend B or C, still offer A, since I may want the resume now and the project later.
5. If B: enter plan mode, read the repo, and get my approval of the plan. Build it in that folder, run it or its tests to show it works, and commit there (ask before pushing). Then call start_edit_project for that project with what was built and follow that workflow to update its entry.
   If C: get my approval of the spec, then create the folder under ${PROJECTS_DIR}, build it, run it to show it works, and git init it. Then call start_new_project with the folder path and follow that workflow to add it.
   In both cases, nothing goes on the resume that isn't in the code.
6. Draft the resume and show it to me for approval. Follow the style reference below (the layout write_resume renders):
   - Header, education (with Relevant Coursework) and experience come from my profile. Experience shows company and dates, then the role in italics. Jobs marked optional are left out unless they help this posting (pass experience_order to include them).
   - Projects: 3 (2 to 4 if the fit calls for it), most relevant first. Don't list ${[...linked].join(" or ") || "a project"} as a project; it already appears under Experience.
   - Bullets: start from the bank's bullets and reword only to use the posting's terms where they're true. Same facts, same numbers; never invent metrics. The lead project and lead job may have up to 5 bullets, the rest 2–3.
   - Bold the key technologies and metrics in each bullet with **double asterisks**, the way the style reference does (for example "Cut **cost per task by 65%**", "on **Amazon Bedrock**").
   - Project tech (shown in the heading): up to 6 tags, posting-relevant first. Keep the heading on one line.
   - Technical Skills: 4 lines, posting-relevant groups and skills first. Add a skill only if a project or job shows it.
   - Past resumes in the library show structure, phrasing and emphasis only. Every fact must come from the bank, my profile, or the code.
7. When I approve, call write_resume with job_text set to the posting. It reads projects as deployed, so if step 5 changed the bank, the update must be pushed first. If it reports more than one page, trim (shorten wrapped bullets first, then drop the weakest bullet or project) and call it again until it fits. Report the .tex and PDF paths.

Library context (style reference and the most similar past resumes):
${library}

My base resume (header, education, experience, skills):
${JSON.stringify(profile, null, 2)}

My projects as currently deployed (local_path is the folder on my machine, if found):
${JSON.stringify(projects, null, 2)}`;
}

const SPEC = z.string().min(1).describe("The project spec: pasted text, or a local path / repo to read");
const REQUEST = z.string().min(1).describe("What to change or add");
const JOB = z.string().min(1).describe("The job: a posting link, the pasted description, or both");

server.registerTool(
  "start_tailor_resume",
  {
    title: "Start tailoring a resume",
    description:
      "First step when the user gives a job (link, description or both) and wants a tailored resume. Returns the workflow " +
      "(read the posting, match projects, optionally extend or create a project, draft for approval, write the LaTeX), " +
      "the base resume and every project. Follow it before calling write_resume.",
    inputSchema: { job: JOB },
    annotations: { readOnlyHint: true },
  },
  async ({ job }) => text(await tailorBrief(job)),
);

server.registerTool(
  "start_new_project",
  {
    title: "Start a new project",
    description:
      "First step when the user asks to add, make or create a project on rahulmoka.com/jobapply. Returns the workflow " +
      "(plan mode, interview, draft for approval), house style and existing skill tags. Follow it before calling create_project.",
    inputSchema: { spec: SPEC },
    annotations: { readOnlyHint: true },
  },
  async ({ spec }) => text(await newProjectBrief(spec)),
);

server.registerTool(
  "start_edit_project",
  {
    title: "Start editing a project",
    description:
      "First step when the user asks to update, edit or add to a project on rahulmoka.com/jobapply. Returns the project's " +
      "current data and the workflow. Follow it before calling update_project.",
    inputSchema: { project: z.string().min(1).describe("Project id or title"), request: REQUEST },
    annotations: { readOnlyHint: true },
  },
  async ({ project, request }) => text(await editProjectBrief(project, request)),
);

server.registerPrompt(
  "tailor_resume",
  {
    title: "Tailor resume to a job",
    description: "Give a job link and/or description; get a LaTeX resume in Desktop/Resumes, extending or adding a project first if needed",
    argsSchema: { job: JOB },
  },
  async ({ job }) => say(await tailorBrief(job)),
);

server.registerPrompt(
  "new_project",
  {
    title: "New jobapply project",
    description: "Interview me about a project spec, then add it with its skills to rahulmoka.com/jobapply",
    argsSchema: { spec: SPEC },
  },
  async ({ spec }) => say(await newProjectBrief(spec)),
);

server.registerPrompt(
  "edit_project",
  {
    title: "Edit jobapply project",
    description: "Pull a project's current data from rahulmoka.com/jobapply and apply my requested change",
    argsSchema: {
      project: completable(z.string().describe("Project id or title"), async (value) => {
        const list = await snapshot();
        const v = String(value || "").toLowerCase();
        return list.filter((p) => p.id.includes(v) || p.title.toLowerCase().includes(v)).map((p) => p.id).slice(0, 20);
      }),
      request: REQUEST,
    },
  },
  async ({ project, request }) => say(await editProjectBrief(project, request)),
);

await server.connect(new StdioServerTransport());
