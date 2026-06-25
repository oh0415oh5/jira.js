# AGENTS.md

Instructions for AI coding agents working on **jira.js** — a TypeScript library for Atlassian Jira Cloud APIs (Node.js ≥ 20, browsers).

## Project overview

- **Purpose:** Hand-maintained HTTP clients for Jira Platform REST API v2/v3, Jira Agile, and Jira Service Management.
- **Not codegen:** API surface is curated manually from [Atlassian REST docs](https://developer.atlassian.com/cloud/jira/platform/rest/). Do not introduce OpenAPI/Swagger generators without maintainer approval.
- **Primary client:** `Version3Client` (`jira.js` or `jira.js/version3`).
- **Package manager:** `pnpm` (v10 in CI). Use `pnpm install --frozen-lockfile`.

## Commands

```bash
pnpm install --frozen-lockfile   # install dependencies
pnpm build                       # rollup build (ESM + CJS) + typecheck tests
pnpm lint                        # eslint (see lint scope below)
pnpm lint:fix                    # auto-fix, includes src/serviceDesk
pnpm test:unit                   # fast unit tests (no credentials)
pnpm test:integration            # live Jira Cloud tests (needs .env)
pnpm test                        # build:tests + unit + integration
pnpm code:formatting             # JSDoc link fixes + prettier + lint:fix
```

**Before opening a PR:** run `pnpm build`, `pnpm lint`, and `pnpm test:unit` at minimum.

## Project structure

```
src/
├── index.ts, createClient.ts, config.ts
├── clients/          # BaseClient, axios layer, HttpException
├── services/         # authentication helpers
├── agile/            # Jira Software/Agile API
├── version2/         # Platform REST API v2
├── version3/         # Platform REST API v3 (primary)
└── serviceDesk/      # Jira Service Management API
```

Each API surface follows the same layout:

```
<api>/
├── client/<name>Client.ts   # extends BaseClient, wires API groups
├── <apiGroup>.ts            # one class per Atlassian API group (e.g. Issues)
├── models/                  # response/request interfaces (camelCase files)
├── parameters/              # per-method parameter interfaces
└── index.ts                 # re-exports + Version3Models / Version3Parameters namespaces
```

```
tests/
├── unit/           # stub sendRequest with sinon; import via @jirajs alias
└── integration/    # live Jira; needs HOST, EMAIL, API_TOKEN in .env
```

`examples/` is a standalone demo app and is **not** linted or tested in CI.

## Adding or updating an API endpoint

1. Add `parameters/<MethodName>.ts` (PascalCase, matches method name).
2. Add model(s) in `models/<camelCase>.ts` (PascalCase export).
3. Export from `parameters/index.ts` and `models/index.ts` (alphabetical `export *`).
4. Add method to the API group class (`src/version3/issues.ts`, etc.):
   - JSDoc copied/adapted from Atlassian docs (include permissions).
   - Callback + Promise overloads.
   - Implementation builds `RequestConfig` and calls `this.client.sendRequest()`.
5. Wire new API group into `client/<name>Client.ts` as a camelCase property.
6. Update `<api>/index.ts` barrel exports.
7. For Platform APIs, **mirror changes in both `version2/` and `version3/`** (only URL prefix differs: `/rest/api/2/` vs `/rest/api/3/`).
8. Add a unit test in `tests/unit/<api>/`. Stub `client.sendRequest` and assert `url`, `method`, `data`, `params`.
9. Update `CHANGELOG.md` for user-facing API changes.

### Method template

```typescript
async createIssue<T = Models.CreatedIssue>(
  parameters: Parameters.CreateIssue,
  callback: Callback<T>,
): Promise<void>;
async createIssue<T = Models.CreatedIssue>(
  parameters: Parameters.CreateIssue,
  callback?: never,
): Promise<T>;
async createIssue<T = Models.CreatedIssue>(
  parameters: Parameters.CreateIssue,
  callback?: Callback<T>,
): Promise<void | T> {
  const config: RequestConfig = {
    url: '/rest/api/3/issue',
    method: 'POST',
    data: { fields: parameters.fields },
  };
  return this.client.sendRequest(config, callback);
}
```

Some methods include convenience transforms (e.g. `Issues.createIssue` converts string `description` to ADF). Match existing patterns in the same API group.

## Code style

Enforced by Prettier + ESLint (`eslint.config.ts`, `.prettierrc`):

- 2-space indent, single quotes, semicolons, trailing commas (multiline), 120-char lines.
- `import type` for type-only imports.
- Blank line after imports and before `return`.
- API group classes: PascalCase (`Issues`). Client properties: camelCase (`issues`).
- Parameter interfaces: PascalCase (`CreateIssue`). Model files: camelCase (`createdIssue.ts`).

Run `pnpm prettier` on `src/` or `pnpm code:formatting` after bulk JSDoc edits.

**Lint scope:** `pnpm lint` covers `src/agile`, `clients`, `services`, `version2`, `version3`, and root `src/*.ts` — but **not** `src/serviceDesk`. Use `pnpm lint:fix` when editing serviceDesk.

## Testing

**Unit tests** (`tests/unit/`):

- Import from `@jirajs` (alias → `src/`).
- Stub `sendRequest` with sinon; assert the outgoing request config.

**Integration tests** (`tests/integration/`):

- Require `.env` with `HOST`, `EMAIL`, `API_TOKEN` (see `.env.example`).
- Use helpers from `tests/integration/utils/`.
- Use `test.sequential()` for ordered, dependent tests.

Agents without Jira credentials should rely on unit tests only.

## Boundaries

- **Do not** commit `.env`, API tokens, or credentials.
- **Do not** use the removed `~` import alias in public-facing code.
- **Do not** edit `dist/`, `docs/`, or `pnpm-lock.yaml` unless the task requires it.
- **Do not** modify `examples/` unless explicitly asked.
- Prefer minimal, focused diffs. Match surrounding code conventions.

## PR guidelines

- Describe what API or behavior changed and why.
- Note whether changes were mirrored across `version2` / `version3`.
- CI runs on Node 20.x and 22.x: build → lint → unit tests → integration tests (with repo secrets).
