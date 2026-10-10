#!/usr/bin/env node
/**
 * jobapply MCP server: adds and edits projects on rahulmoka.com/jobapply.
 *
 * The page's server data is private/jobapply/projects.json on origin/master. This
 * server keeps its own detached git worktree of the portfolio repo (JOBAPPLY_REPO),
 * resets it to origin/master before every read and write, and publishes by
 * committing that one file and pushing to master, which redeploys the site on Vercel.
 * It never touches your normal checkout.
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { completable } from "@modelcontextprotocol/sdk/server/completable.js";
import { z } from "zod";

const run = promisify(execFile);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(process.env.JOBAPPLY_REPO || path.join(HERE, "..", "..", "..", "portfolio-mcp"));
const REMOTE = process.env.JOBAPPLY_REMOTE || "origin";
const BRANCH = process.env.JOBAPPLY_BRANCH || "master";
const SITE_URL = "https://rahulmoka.com/jobapply";
const DATA_FILE = "private/jobapply/projects.json";

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
  { name: "jobapply", version: "0.1.0" },
  {
    instructions:
      "Manages the project bank at rahulmoka.com/jobapply. To add a project, use the new_project prompt workflow: " +
      "interview the user and get their approval of a full draft before calling create_project. To change one, read it with " +
      "get_project first and confirm the change before calling update_project. Writes push to the live site.",
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
    description: "List every project on the jobapply page (id, title, category, type, dates, tech), as currently deployed.",
    annotations: { readOnlyHint: true },
  },
  async () => {
    const list = await snapshot();
    return text(list.map(({ id, title, category, type, dates, tech }) => ({ id, title, category, type, dates, tech })));
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
    return p ? text(p) : fail(`No project matches "${project}". Known ids: ${list.map((x) => x.id).join(", ")}`);
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
      "Add a new project to rahulmoka.com/jobapply and push it live. Only call this after interviewing the user about the " +
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
      "Change fields of an existing project on rahulmoka.com/jobapply and push it live. Read it with get_project first. " +
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

// ---------- prompts (slash commands) ----------
const say = (body) => ({ messages: [{ role: "user", content: { type: "text", text: body } }] });

function styleExamples(list) {
  return list
    .filter((p) => !p.example && p.bullets?.length)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 2)
    .map((p) => JSON.stringify(ordered(p), null, 2))
    .join("\n\n");
}

server.registerPrompt(
  "new_project",
  {
    title: "New jobapply project",
    description: "Interview me about a project spec, then add it with its skills to rahulmoka.com/jobapply",
    argsSchema: { spec: z.string().describe("The project spec: pasted text, or a local path / repo to read") },
  },
  async ({ spec }) => {
    const list = await snapshot();
    const vocab = skillVocab(list).map(([t, n]) => `${t} (${n})`).join(", ");
    return say(`I want to add a new project to my resume project bank at ${SITE_URL}.

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
</spec>`);
  },
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
      request: z.string().describe("What to change or add"),
    },
  },
  async ({ project, request }) => {
    const list = await snapshot();
    const p = findProject(list, project);
    if (!p) {
      return say(`I asked to edit the jobapply project "${project}", but nothing matches it. Show me this list and ask which one I meant, then continue with my request: "${request}".

${list.map((x) => `- ${x.id}: ${x.title}`).join("\n")}`);
    }
    return say(`I want to edit a project in my resume project bank at ${SITE_URL}. Here is its current data, as currently deployed:

${JSON.stringify(ordered(p), null, 2)}

My request:
<request>
${request}
</request>

1. If the request points at a local repo or new work, read what you need to get the facts right. If something important is unclear (for example, a metric), ask me instead of guessing.
2. Show me exactly which fields change, before and after. Keep the existing bullet style: strong past-tense verb, concrete work, then impact, roughly one line each. Never invent numbers.
3. For new skills, reuse existing tag spellings where they exist. Current tags: ${skillVocab(list).map(([t]) => t).join(", ")}
4. Once I confirm, call update_project with project "${p.id}" and only the changed fields. bullets and tech replace the whole array, so send the full new list. Then report the commit.`);
  },
);

await server.connect(new StdioServerTransport());
