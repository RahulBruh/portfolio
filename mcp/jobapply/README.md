# jobapply MCP server

Local stdio MCP server that adds and edits projects on [rahulmoka.com/jobapply](https://rahulmoka.com/jobapply).

The page's server data is `private/jobapply/projects.json` on `origin/master`. The server works in its own detached git worktree (`JOBAPPLY_REPO`, default `../portfolio-mcp` next to this repo; it's created on first use). It resets that worktree to `origin/master` before every read and write. To publish, it commits only that file and pushes to `master`, and Vercel redeploys in about a minute. Your normal checkout is never touched.

## Setup

```sh
cd mcp/jobapply
npm install
claude mcp add jobapply --scope user -e JOBAPPLY_REPO=C:/Users/Rahul/Desktop/portfolio-mcp -- node C:/path/to/portfolio/mcp/jobapply/server.mjs
```

## Use (Claude Code)

- `/mcp__jobapply__new_project <spec or repo path>`: enters plan mode, reads the spec, asks about anything it doesn't cover (category, dates, link, real metrics), drafts the summary, bullets and skill tags for approval, then publishes.
- `/mcp__jobapply__edit_project <project> <request>`: pulls the project's current data from `origin/master`, proposes the field changes, then publishes after you confirm.

## Tools

| Tool | |
|---|---|
| `list_projects` | id, title, category, type, dates, tech |
| `get_project` | full data for one project (id or title) |
| `list_skills` | existing skill tags with counts |
| `create_project` | validate, add, commit, push (`dry_run` to preview) |
| `update_project` | change fields; `bullets`/`tech` replace whole (`dry_run` to preview) |

`CATEGORIES` and `TYPES` in `server.mjs` mirror the ones in `private/jobapply/page.html`; keep them in sync.

Env vars: `JOBAPPLY_REPO`, `JOBAPPLY_REMOTE` (default `origin`), `JOBAPPLY_BRANCH` (default `master`).

The page merges server data with browser edits by `updatedAt`, so projects published here show up even in a browser that has local changes.
