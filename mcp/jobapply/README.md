# jobapply MCP server

Local stdio MCP server that adds and edits projects on [rahulmoka.com/jobapply](https://rahulmoka.com/jobapply), and tailors LaTeX resumes from them.

The page's server data is `private/jobapply/projects.json` on `origin/master`. The server works in its own detached git worktree (`JOBAPPLY_REPO`, default `../portfolio-mcp` next to this repo; it's created on first use). It resets that worktree to `origin/master` before every read and write. To publish, it commits only that file and pushes to `master`, and Vercel redeploys in about a minute. Your normal checkout is never touched.

## Setup

```sh
cd mcp/jobapply
npm install
claude mcp add jobapply --scope user -e JOBAPPLY_REPO=C:/Users/Rahul/Desktop/portfolio-mcp -- node C:/path/to/portfolio/mcp/jobapply/server.mjs
```

## Use (Claude Code)

- `/mcp__jobapply__tailor_resume <job link and/or description>`: reads the posting (`fetch_job`), matches it against your projects, then asks which path to take: write the resume now, extend an existing project first (in its folder on the Desktop, then updates its entry), or build a new project first (then adds it). After you approve the draft it writes `Desktop/Resumes/<Company> - <Role>/Rahul_Moka_Resume.tex` and compiles a PDF if a LaTeX engine is installed. On the /jobapply page, "Copy Claude request" copies the same request for the job in the link and description fields.
- `/mcp__jobapply__new_project <spec or repo path>`: enters plan mode, reads the spec, asks about anything it doesn't cover (category, dates, link, real metrics), drafts the summary, bullets and skill tags for approval, then publishes.
- `/mcp__jobapply__edit_project <project> <request>`: pulls the project's current data from `origin/master`, proposes the field changes, then publishes after you confirm.

Plain requests work the same way, e.g. "use jobapply to tailor my resume to <link>", "use jobapply to add this project: …" or "update the GraphRAG project with …". Claude calls `start_tailor_resume` / `start_new_project` / `start_edit_project`, which return the same workflow as the slash commands.

## Tools

| Tool | |
|---|---|
| `start_tailor_resume` | the tailoring workflow, base resume and every project (call first) |
| `fetch_job` | a posting link's title, company, location and text |
| `write_resume` | render the LaTeX resume into `JOBAPPLY_RESUME_DIR`, compile it, fail if it's over one page, then add it to the library |
| `add_resume` | store a resume (.pdf/.tex/.html/.md) in the library; `style_reference` pins the layout to mimic |
| `search_library` | hybrid search over past resume bullets, projects and stored postings |
| `similar_resumes` | the style reference plus the past resumes closest to a posting |
| `list_library` / `remove_resume` | what's indexed / drop a document |
| `list_projects` | id, title, category, type, dates, tech, `local_path` |
| `get_project` | full data for one project (id or title), plus `local_path` |
| `start_new_project` | the new-project workflow, house style and skill tags (call first) |
| `start_edit_project` | a project's current data plus the edit workflow (call first) |
| `list_skills` | existing skill tags with counts |
| `create_project` | validate, add, commit, push (`dry_run` to preview) |
| `update_project` | change fields; `bullets`/`tech` replace whole (`dry_run` to preview) |

`CATEGORIES` and `TYPES` in `server.mjs` mirror the ones in `private/jobapply/page.html`; keep them in sync.

Env vars: `JOBAPPLY_REPO`, `JOBAPPLY_REMOTE` (default `origin`), `JOBAPPLY_BRANCH` (default `master`), `JOBAPPLY_PROJECTS_DIR` (where project repos live, default `~/Desktop`), `JOBAPPLY_RESUME_DIR` (default `~/Desktop/Resumes`), `JOBAPPLY_LATEX` (path to `pdflatex` or `tectonic` if it isn't on `PATH`), `JOBAPPLY_LIBRARY_DIR` (default `library/` here).

## Resumes

The header, education, experience and skills come from `profile.json`; edit it when they change. It holds your phone number and references, so it's gitignored and exists only on your machine (fields: `name`, `headerNote`, `contact[{text,url?}]`, `education[{school,location,degree,dates,bullets}]`, `experience[{company,title,dates,location?,bullets?,project?,optional?,note?}]`, `skills[{label,items}]`). An experience entry with `project` takes its bullets from that bank project unless it has its own; `optional` jobs are left out unless `write_resume` gets `experience_order`. Projects come from the bank as deployed.

`resume.mjs` renders the layout of the EA resume: plain name, status line, company and dates over an italic role, `**bold**` keywords in bullets and skills, underlined project links and tight lists. PDFs need pdflatex (MiKTeX) or tectonic; the server also looks in `%LOCALAPPDATA%\Programs\tectonic\`. Otherwise only the `.tex` is written (it opens in Overleaf). The page count is read from the PDF, and anything over one page is returned as an error with the overflow text. `fetch_job` shares `src/lib/jobPosting.mjs` with the page's `/jobapply/job` route.

## Library

`library.mjs` keeps a local store of past resumes, bank projects and job postings in `library/` (gitignored: it holds copies of your resumes). Resumes are parsed into sections, entries and bullets, so the store knows each one's structure and not just its text. Every bullet, heading and skills line is a chunk. Search fuses BM25 with cosine similarity of `all-MiniLM-L6-v2` embeddings (transformers.js, run locally; the model downloads once into `library/models`) using reciprocal-rank fusion, and falls back to BM25 if the model can't load. Projects are re-indexed whenever the bank's `updatedAt` changes.

`start_tailor_resume` attaches the style reference's outline and the two past resumes most similar to the posting, and tells the agent to `search_library` each requirement. Past resumes guide structure and phrasing only; facts still come from the bank and `profile.json`. Every resume `write_resume` produces, along with its posting, is added back, so the library grows as you apply.

The page merges server data with browser edits by `updatedAt`, so projects published here show up even in a browser that has local changes.
