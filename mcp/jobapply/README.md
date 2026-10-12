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
| `write_resume` | render the LaTeX resume into `JOBAPPLY_RESUME_DIR` and compile it |
| `list_projects` | id, title, category, type, dates, tech, `local_path` |
| `get_project` | full data for one project (id or title), plus `local_path` |
| `start_new_project` | the new-project workflow, house style and skill tags (call first) |
| `start_edit_project` | a project's current data plus the edit workflow (call first) |
| `list_skills` | existing skill tags with counts |
| `create_project` | validate, add, commit, push (`dry_run` to preview) |
| `update_project` | change fields; `bullets`/`tech` replace whole (`dry_run` to preview) |

`CATEGORIES` and `TYPES` in `server.mjs` mirror the ones in `private/jobapply/page.html`; keep them in sync.

Env vars: `JOBAPPLY_REPO`, `JOBAPPLY_REMOTE` (default `origin`), `JOBAPPLY_BRANCH` (default `master`), `JOBAPPLY_PROJECTS_DIR` (where project repos live, default `~/Desktop`), `JOBAPPLY_RESUME_DIR` (default `~/Desktop/Resumes`), `JOBAPPLY_LATEX` (path to `pdflatex` or `tectonic` if it isn't on `PATH`).

## Resumes

The header, education, experience and skills come from `profile.json`; edit it when they change. It holds your phone number and references, so it's gitignored and exists only on your machine (fields: `name`, `contact[{text,url?}]`, `headerNote`, `education[{school,location,degree,dates,bullets}]`, `experience[{title,company,dates,note?,bullets}]`, `skills[{label,items}]`). Projects come from the bank as deployed. `resume.mjs` renders Jake's resume template. To get PDFs, install MiKTeX (`winget install MiKTeX.MiKTeX`) or tectonic; otherwise only the `.tex` is written (it opens in Overleaf). `fetch_job` shares `src/lib/jobPosting.mjs` with the page's `/jobapply/job` route.

The page merges server data with browser edits by `updatedAt`, so projects published here show up even in a browser that has local changes.
