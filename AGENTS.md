<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Git + deployment — required for every coding session

**Every agent that changes code must get its work into the real repository and out to
the live site.** Local-only edits do not count as done.

| | |
| --- | --- |
| Repository | `github.com/sheikhmdnasrullah-dotcom/music.tanim.social` |
| Branch | `main` (single branch — commit straight to it) |
| Hosting | Vercel project `project`, Git integration enabled |
| Live URL | **https://music.tanim.social** |
| Deploy trigger | push to `main` — Vercel clones GitHub and builds automatically |

There is no separate deploy step. `git push origin main` **is** the release.

## Before you push

Run all three. A push that breaks the build takes the live site's deploy red.

```bash
npx tsc --noEmit                 # type check
node --test --import ./tests/setup/register.mjs "tests/**/*.test.ts"
npm run build                    # what Vercel actually runs
```

`next build` type-checks the whole project, so one broken file anywhere fails the
deploy — not just the file you touched.

## While you push

- `git status` first. Several agents share this working tree. Stage **your** files
  only: `git add <specific paths>` — never `git add .`
- Commit with a message that says what actually changed.
- If the push races another agent and is rejected, `git pull --rebase origin main`
  and push again. Never force-push.
- After pushing, confirm the deploy went green:

```bash
npx vercel ls                       # latest deployments
curl -sI https://music.tanim.social # should be 200
```

## Rules that exist because they were already broken once

- **Do not commit a red build.** `main` failing type check leaves production serving a
  stale build with no error visible to the user.
- **Do not edit synced/generated files by hand** — see `docs/` and the CI notes below.
- **Parallel work:** inspect `git status` and the last commit before touching shared
  files (`src/state/`, `src/data/`, `src/types/`, `package.json`). Small, focused
  commits are easier for the next agent to reason about.
- Untracked work is invisible to Vercel. If it is not committed, it is not deployed.

## Checks available to you

| Command | Purpose |
| --- | --- |
| `npm run lint` | ESLint (not part of the build, but keep your own files clean) |
| `npm run build` | Production build — the deploy gate |
| `node --test --import ./tests/setup/register.mjs "tests/**/*.test.ts"` | Unit tests, zero dependencies |
| `npx vercel ls` | Deployment history |
| `npx vercel inspect <url> --logs` | Build logs for a failed deploy |
