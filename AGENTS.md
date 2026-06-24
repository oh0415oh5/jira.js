# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is
`jira.js` is a JavaScript/TypeScript **library** (an Atlassian Jira REST API client), not a runnable server/app. "Running" it means building it and exercising the client (e.g. instantiating `Version3Client` and making requests). It targets Node.js `>=20` and uses `pnpm` (lockfile: `pnpm-lock.yaml`).

### Standard commands (see `package.json` scripts)
- Build: `pnpm run build` (Rollup builds ESM+CJS into `dist/`, then `tsc` typechecks tests). Build artifacts land in `dist/` and are git-ignored.
- Lint: `pnpm run lint` (ESLint over `src` + `tests`). Auto-fix: `pnpm run lint:fix`.
- Unit tests: `pnpm run test:unit` (Vitest, no network/credentials needed).
- Integration tests: `pnpm run test:integration` (requires real Jira credentials — see below).
- `pnpm test` runs build:tests + unit + integration, so it fails without credentials; prefer `pnpm run test:unit` for credential-free verification.

### Integration tests require credentials (expected to fail without them)
Integration tests hit a live Jira Cloud instance. They read `HOST`, `EMAIL`, `API_TOKEN` from a `.env` file (loaded via `dotenv/config` in `vitest.config.mts`; template in `.env.example`). With no credentials, `HOST` is empty and `ConfigSchema` throws an "Invalid url" Zod error before any test runs — this is a missing-credential symptom, not a code bug. These tests also create/delete real projects and issues, so only run them against a throwaway Jira instance.

### Notes
- The `replace:*` scripts in `package.json` use BSD `sed -i ''` syntax (macOS); they are doc-maintenance helpers and are not needed for build/lint/test on Linux.
- `pnpm-workspace.yaml` pre-approves builds for `esbuild` and `unrs-resolver`, so `pnpm install` runs non-interactively (no `pnpm approve-builds` prompt).
- `examples/` is a separate npm package that depends on the published `jira.js` and also needs real Jira credentials (`examples/src/credentials.ts`).
