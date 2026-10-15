# Local development (Windows / PowerShell)

Prerequisites: Node 24.19.0, npm 12.0.2, .NET SDK 10.0.401, Git and PowerShell 7. Docker/Compose is optional for frontend and dependency-free API development. No global Angular CLI, Astro CLI or EF tool is needed.

```powershell
Set-Location D:\Caelora-website
npm ci
npm run bootstrap
dotnet restore Caelora.Platform.slnx --locked-mode
```

Bootstrap creates ignored local .env, web .env and portal runtime JSON only when absent. Existing files are preserved. It generates a random local PostgreSQL password and never prints it. `npm ci` uses the lockfile; install scripts are intentionally restricted by npm 12. Prebuilt optional native dependencies worked on the tested Windows machine; do not blanket-approve scripts to fix another platform without review.

Run each application in its own terminal:

| Command             | Local address         |
| ------------------- | --------------------- |
| npm run dev:web     | http://localhost:4321 |
| npm run dev:account | http://localhost:4200 |
| npm run dev:admin   | http://localhost:4300 |
| npm run dev:api     | http://localhost:5080 |

All dev servers bind loopback. Keep the same hostname as configured API CORS origins; localhost and 127.0.0.1 are different browser origins. The API's Development JSON allows localhost:4200/4300. Astro needs no running API. Account connection checking is an explicit public GET; an unavailable API has a visible retry state.

## Optional real local dependencies

### Verified M2 native identity path

On this workstation Docker's engine fails during startup; PostgreSQL 18 binaries are installed. This creates a separate loopback cluster, leaving the existing PostgreSQL service and its data untouched:

```powershell
npm run infra:native
pwsh -NoProfile -File scripts/dev-api.ps1 -Migrate
npm run test:identity
```

The helper uses `C:\Program Files\PostgreSQL\18\bin` by default (`-PostgresBin` overrides it) and downloads the pinned official Mailpit v1.31.6 release if absent. It preserves local state/configuration, prints no password, and starts processes hidden. State is anchored under the primary checkout's ignored `artifacts/local-platform`, including from worktrees. This Windows helper is not a production database manager. Migration remains explicit.

Set public `PUBLIC_ACCOUNT_URL=http://localhost:4200` in `apps/web/.env` to enable navigation. Account runtime JSON uses apiBaseUrl `http://localhost:5080` and websiteUrl `http://localhost:4321` from bootstrap examples. Run the four application commands above in separate terminals. Open `http://localhost:8025` for real verification/reset emails. No production mail credentials are needed. Use hostname `localhost` in the browser; servers bind loopback.

Accounts require explicitly enabled identity configuration. The portal shows actual API connection failures. Admin remains the M1 restricted shell; account authentication grants no administrative privileges.

`npm run test:identity` reads the native connection internally unless CAELORA_TEST_POSTGRES is already supplied, then restores the prior environment. It fails without infrastructure/configuration. Normal `npm run verify` explicitly skips PostgreSQL tests without that environment; a skip is not identity validation. Tests create/drop their own generated databases and never reset the developer's caelora database.

### Compose path (syntax verified; runtime blocked locally)

Compose now includes loopback Mailpit alongside PostgreSQL and Redis. Its API profile remains a dependency-readiness foundation; identity must be explicitly configured for the chosen topology. A native API can use Compose's loopback Mailpit SMTP port. Mailpit's local-only configuration does not silently permit a remote SMTP host.

Start Docker Desktop's Linux engine. Then:

```powershell
pwsh -NoProfile -File scripts/bootstrap.ps1 -EnableDependencies
npm run infra:up
pwsh -NoProfile -File scripts/dev-api.ps1 -Migrate
npm run dev:api
```

The ignored Local JSON enables PostgreSQL and Redis using .env values. Migration is explicit. If you enabled dependencies, stopping Docker makes readiness return 503, not silently disable them. Liveness remains 200. To return deliberately to dependency-free development, move/delete only the generated Local JSON after reviewing it, or explicitly override both enabled flags in your shell. Bootstrap never overwrites prior local settings or regenerates an existing database password.

PostgreSQL binds host port 55432, Redis 56379, both loopback. The local Redis has no authentication and must never be exposed. Postgres volume uses the PostgreSQL 18 parent data path. `npm run infra:down` stops containers without deleting volumes. Do not add -v casually: it destroys local database state.

Containerized API alternative:

```powershell
docker compose --env-file .env -f infrastructure/docker/compose.yml --profile api build api
docker compose --env-file .env -f infrastructure/docker/compose.yml --profile api run --rm api --migrate
docker compose --env-file .env -f infrastructure/docker/compose.yml --profile api up -d api
```

Do not run native and container API on the same port simultaneously. Container runtime defaults to Development only in this local stack. `npm run infra:validate` validates Compose against safe example values without displaying resolved secrets. Do not copy local Compose to production.

## Verification and builds

`npm run verify` checks formatting, lint, Astro/shared-client types, Node tests, all frontend builds, static links/assets, .NET build/tests, source secret patterns and Compose syntax. The .NET build uses locked restore. Run `npm ci`, bootstrap and an initial locked restore first. Root format does not format C#; `dotnet format Caelora.Platform.slnx --verify-no-changes` is an additional C# style check when editing server source.

Outputs: `apps/web/dist`, `dist/account/browser`, `dist/admin/browser`, API release bin/publish outputs. `npm run build` does not deploy. Astro preview: `npm run preview --workspace=@caelora/web`. Build-time public web origin/environment must be set explicitly for a staging/production build.

`npm run test:dependencies` requires explicit CAELORA_TEST_POSTGRES and CAELORA_TEST_REDIS connection strings to disposable dependencies. It migrates the chosen database, starts a temporary loopback API and verifies both dependencies are enabled/healthy. Never point it at production. The basic test suite requires neither connection.

CI definitions run Windows/Linux foundation checks plus an Ubuntu live-dependency job. Their presence is not evidence that GitHub has run them. See [verification record](../audits/verification.md) for actual local results and Docker limitations.
