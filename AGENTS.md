# AGENTS.md

Guidance for AI coding agents working in the **jira.js** repository.

## Project overview

**jira.js** is a TypeScript/JavaScript client library for Atlassian Jira Cloud APIs. It supports:

- **Version 3** (`Version3Client`) — primary Jira Platform REST API
- **Version 2** (`Version2Client`) — legacy Jira Platform REST API
- **Agile** (`AgileClient`) — Jira Software / Agile REST API
- **Service Desk** (`ServiceDeskClient`) — Jira Service Management REST API

The library targets **Node.js 20+** and browsers. It ships dual **ESM** and **CJS** builds via Rollup.

## Repository layout

```
src/
├── clients/          # BaseClient, HTTP layer, error handling
├── services/         # Shared services (e.g. authentication)
├── config.ts         # Client configuration and Zod schema
├── createClient.ts   # Factory for typed client creation
├── agile/            # Agile API modules
├── version2/         # REST API v2 modules
├── version3/         # REST API v3 modules (preferred for new work)
└── serviceDesk/      # Service Desk API modules

tests/
├── unit/             # Stubbed HTTP tests (no live Jira required)
└── integration/      # Live Jira instance tests (require .env credentials)

examples/             # Usage examples
dist/                 # Build output (generated; do not edit)
```

Each API area follows a consistent pattern:

| Directory | Purpose |
|-----------|---------|
| `src/version3/issues.ts` | Service class with endpoint methods |
| `src/version3/parameters/` | Request parameter types |
| `src/version3/models/` | Response / payload types |
| `src/version3/client/version3Client.ts` | Aggregates all service classes |

## Development setup

```bash
pnpm install --frozen-lockfile
```

Use **pnpm** (v10 in CI). Do not use npm or yarn for lockfile changes.

### Environment for integration tests

Copy `.env.example` to `.env` and set:

```
HOST=https://your-domain.atlassian.net
EMAIL=your@email.com
API_TOKEN=your_api_token
```

Integration tests are skipped or fail without valid credentials. Unit tests do not need `.env`.

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm run build` | Build source and test TypeScript |
| `pnpm run build:src` | Rollup build to `dist/` |
| `pnpm run lint` | ESLint across source and tests |
| `pnpm run lint:fix` | Auto-fix lint issues |
| `pnpm run test` | Full test suite (unit + integration) |
| `pnpm run test:unit` | Unit tests only — prefer this for most changes |
| `pnpm run test:integration` | Live API tests — requires `.env` |
| `pnpm run prettier` | Format `src/` |
| `pnpm run doc` | Generate TypeDoc site |

**Before opening a PR**, run at minimum:

```bash
pnpm run build && pnpm run lint && pnpm run test:unit
```

## Code conventions

Match existing style in the file you edit.

- **TypeScript** with `strict` mode
- **2-space** indentation, **single quotes**, **semicolons**, **trailing commas** in multiline structures
- Use `import type` for type-only imports (`@typescript-eslint/consistent-type-imports`)
- Prefer `type` imports from `./models` and `./parameters` in service files
- JSDoc on public API methods — copy wording from [Atlassian REST docs](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/) when adding endpoints
- Use full Atlassian doc URLs in JSDoc links, not relative `#anchor` fragments

### Service method pattern

Every endpoint method uses callback overloads for optional promise style:

```typescript
async methodName<T = Models.SomeType>(parameters: Parameters.SomeParams, callback: Callback<T>): Promise<void>;
async methodName<T = Models.SomeType>(parameters: Parameters.SomeParams, callback?: never): Promise<T>;
async methodName<T = Models.SomeType>(parameters: Parameters.SomeParams, callback?: Callback<T>): Promise<void | T> {
  const config: RequestConfig = {
    url: '/rest/api/3/...',
    method: 'GET',
    params: { ... },
  };

  return this.client.sendRequest(config, callback);
}
```

### Client registration

When adding a new service class:

1. Create the service file under the appropriate API version directory
2. Export it from that directory's `index.ts`
3. Import and expose it as a property on the version client (e.g. `Version3Client`)

### Tree shaking

The package supports subpath imports (`jira.js/version3`, `jira.js/agile`, etc.). New modules must be included in Rollup's `preserveModules` output automatically via `src/index.ts` exports — avoid breaking subpath boundaries.

## Testing guidelines

### Unit tests

- Location: `tests/unit/<area>/`
- Use **vitest** and **sinon** to stub `client.sendRequest`
- Assert the `RequestConfig` passed to `sendRequest` (URL, method, `data`, `params`)
- Import clients from `@jirajs` alias (configured in test tsconfig)

### Integration tests

- Location: `tests/integration/<area>/`
- Require live Jira credentials in `.env`
- Use helpers in `tests/integration/utils/` for project/issue setup and cleanup
- Run serially (`--no-file-parallelism`) — do not parallelize integration tests

Add unit tests for new or changed request shaping logic. Add integration tests only when behavior must be verified against a live Jira instance.

## What to change vs. leave alone

### Safe to modify

- Bug fixes in request/response handling
- New or updated API endpoints mirroring Atlassian spec changes
- Type definitions in `models/` and `parameters/`
- Unit tests
- Documentation in `README.md` and JSDoc

### Avoid unless explicitly requested

- Regenerating large swaths of API surface by hand (prefer targeted edits)
- Changing `axios` version or HTTP client architecture
- Modifying `rollup.config.ts` or package `exports` map without strong reason
- Running `pnpm run code:formatting` (bulk replace + prettier across all of `src/`) for small changes
- Editing `dist/` or `pnpm-lock.yaml` without corresponding dependency changes

### Never commit

- `.env` with real credentials
- API tokens or secrets

## CI expectations

GitHub Actions (`.github/workflows/ci.yaml`) runs on all branches:

1. **Build** — Node 20.x and 22.x
2. **Lint** — after build
3. **Unit tests** — after build
4. **Integration tests** — after lint + unit tests; uses repository secrets

PRs must pass build, lint, and unit tests. Integration test failures due to missing secrets in the agent environment are expected; CI will run them with secrets.

## Common tasks

### Add or update a REST endpoint

1. Find the matching service class in `src/version3/` (or v2/agile/serviceDesk)
2. Add parameter types in `parameters/`
3. Add model types in `models/` if needed
4. Implement the method following the overload pattern above
5. Add a unit test stubbing `sendRequest`
6. Run `pnpm run build && pnpm run lint && pnpm run test:unit`

### Fix a type error

- Check both the service method generic default and the model in `models/`
- Ensure `parameters/` types match Atlassian's request schema

### Update dependencies

```bash
pnpm update <package>
pnpm run build && pnpm run test:unit
```

Commit `package.json` and `pnpm-lock.yaml` together.

## Pull request checklist

- [ ] Change is scoped to the requested API area or bug
- [ ] `pnpm run build` succeeds
- [ ] `pnpm run lint` passes
- [ ] `pnpm run test:unit` passes
- [ ] New endpoints have unit test coverage
- [ ] JSDoc references official Atlassian documentation
- [ ] No secrets or `.env` committed
- [ ] `CHANGELOG.md` updated for user-facing changes (follow existing format)

## References

- [README.md](./README.md) — user-facing documentation
- [Atlassian Jira Cloud REST API v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)
- [Atlassian Jira Agile REST API](https://developer.atlassian.com/cloud/jira/software/rest/intro/)
- [Atlassian Jira Service Management REST API](https://developer.atlassian.com/cloud/jira/service-desk/rest/intro/)
