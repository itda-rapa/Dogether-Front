# Dogether Frontend — Claude Working Rules

## Scope

- Workspace: `C:\work\dogether-front`
- React + TypeScript + Vite.
- Change only what was asked for.
- Never add `.claude/` or personal harness files to Git.
- Commit, push, and PR creation only when explicitly requested.

## Token Discipline

Correctness comes first, but cost is driven by call count multiplied by context
size. Keep the call count down.

- Batch independent shell commands into a single call (`A; B; C`).
- Search with the Grep/Glob tools. Do not substitute shell `rg`, `find`, or `cat`.
- Do not re-read a file after Edit/Write to confirm the change landed.
- Verify browser state with `read_page` / `read_console_messages` in one pass.
  Do not repeat one-off `javascript_tool` calls.
- Stop and report after 3 failed attempts at the same problem. Do not keep
  retrying variations.
- Use subagents only when explicitly asked.
- Check `git status --short --branch` only when the work could collide with
  existing changes. Skip it if git state was already injected at session start.

## Verification

- Run the narrowest check first.
- TypeScript changes: `npm run typecheck`
- Then `npm run lint`; run `npm run build` only when actually needed.
- Do not repeat the same full build without a reason.
- Mark any check as `NOT_VERIFIED` if it was not run or its output was not seen.
- If a check fails, say so and include the relevant output.

## Reporting

- Keep progress updates to 3–5 lines.
- Do not restate the list of files read.
- Do not paste whole files or full diffs. When proposing a change for approval,
  show only the affected snippet.
- Final report covers: result / changed files / verification / open issues.
- In a long session, do not re-summarize everything. State the current goal,
  changed files, remaining work, and verification status. Re-read the source of
  truth instead of reconstructing past decisions from memory.

## Frontend Architecture

- All API calls go through `apiRequest()` in `src/lib/api.ts`.
- Components never call the AI server or other backend services directly.
- Unwrap the server response envelope in the API layer.
- Use React Query for server state.
- Distinguish a failed request from a successful fallback response.
- Do not invent a new query key without checking existing keys and cache policy.
- After a new message or state change, invalidate/refetch only the queries needed.

## Authentication Tokens

- Never expose the access token in URLs, logs, or error messages.
- Components never read or store tokens directly.
- Reuse the existing `configureAuth()` and `apiRequest()` flow.
- Do not reimplement 401 refresh-retry logic in individual API calls.
- Never include real tokens, passwords, or `.env` values in output or commits.

## Design Tokens

- Use existing Tailwind and design tokens for color, spacing, borders, backgrounds.
- Do not hardcode HEX or RGB values without a specific reason.
- Prefer the existing `primary`, `surface`, `border`, `muted`, `destructive` scales.
- Build mobile-first and keep existing `max-w`, spacing, and typography rules.

## Change Safety

- Check for and preserve pre-existing dirty files before starting.
- Do not clean up or reformat unrelated files.
- Do not overwrite changes made by the user or another agent.
- If a contract is unclear, report it as an open issue instead of extending it
  on your own.
