# Caelora Production Recovery — 2026-11-12

## Incident summary

Railway project `ca01b42b-625e-4c01-8e83-7ce0f6502d47`, environment `production` (`2ff1d63e-4fc0-40f6-adcb-bb7c17616614`) had failed deployments for all three frontend services. The affected services were:

| Service            | Railway service ID                     | Initial deployment                     | Initial status |
| ------------------ | -------------------------------------- | -------------------------------------- | -------------- |
| `@caelora/web`     | `3c8dd4cf-7849-46a7-abc3-8528c2f67f50` | `543ff895-c775-4dd9-b67d-e5b5cd3a721b` | `FAILED`       |
| `@caelora/admin`   | `bf9c17d2-3b4b-43ce-bc03-77eee156b0de` | `9d112ab6-1940-41e8-84f4-1c2fb3af2522` | `FAILED`       |
| `@caelora/account` | `0cb7e2b9-9217-4791-866d-51f59209cf95` | `5bdd974c-413d-403c-9be0-198209b01c65` | `FAILED`       |

## Confirmed root causes

1. Railpack installed Node `24.19.0` with npm `11.17.0`, while the repository required npm `>=12 <13` with `engine-strict=true`. Web and admin failed during the automatic `npm install` step with `EBADENGINE`; compilation was never reached.
2. The services had no production start command. Web was configured to run Astro development mode on loopback; account and admin had no explicit build or start command.
3. No API service or API domain exists in this Railway project. The account UI can be served and its routes load, but live authentication/API behavior cannot be accepted until a real API origin is deployed and wired.

## Repairs

- Relaxed the npm engine floor to `>=11 <13` in `package.json` and `package-lock.json`, matching the npm version supplied by Railway while retaining the Node 24.19 requirement.
- Added `scripts/serve-production.mjs`, a small production static server that:
  - binds to Railway's `PORT` on `0.0.0.0`;
  - serves the compiled web, account, and admin artifacts;
  - supports Angular SPA fallback routes;
  - serves validated runtime configuration as `runtime-config.json` without caching;
  - sets security headers and immutable caching for hashed assets.
- Configured Railway build/start commands:
  - web: `npm run build --workspace=@caelora/web` / `node scripts/serve-production.mjs --app web`
  - account: `npx ng build account --configuration production` / `node scripts/serve-production.mjs --app account`
  - admin: `npx ng build admin --configuration production` / `node scripts/serve-production.mjs --app admin`
- Configured `/` health checks, 30-second timeout, bounded restart retries, watch patterns covering apps/packages/scripts/root lockfiles, one replica, 1 vCPU, and 2 GB memory for each service.
- Generated Railway-managed domains:
  - web: `https://caeloraweb-production.up.railway.app`
  - account: `https://caeloraaccount-production.up.railway.app`
  - admin: `https://caeloraadmin-production.up.railway.app`
- Set public web build origins and portal runtime origins. Until an API service exists, the portal API origin currently points at the web origin so the strict runtime manifest can load; API calls were explicitly tested and return `404`, so authentication is not claimed as working.

## Git and deployments

- Branch: `main`
- Commit: `c21efc3720a4d4a8aa56faca685fff452412982e`
- Push: completed to `origin/main`
- Successful deployment IDs for the repair commit:
  - web: `0a1a49f0-f06b-40b9-ae8f-aea63599ab2b`
  - admin: `bb6b76fe-5114-4986-aacb-02883707d08e`
  - account: `9e2c1eb0-028b-4096-95e5-116cf0613f7f`
- No rollback was needed. No database, volume, project, repository, or production data was deleted or migrated.

## Verification

Local checks passed:

- `npm ci --ignore-scripts`
- web, account, and admin production builds
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:site`
- `npm run test:repository`
- `npm run security:scan`
- `npm run format:check`
- local production-server smoke tests for HTML, SPA fallback, assets, and runtime JSON

Railway verification passed:

- All three deployments reached `SUCCESS` and their `/` health checks succeeded.
- Web: `/`, `/journal/foundation/`, `/project-information/`, `/robots.txt`, and a WebP asset returned HTTP 200.
- Account: `/sign-in`, `/register`, `/forgot-password`, `/reset-password`, `/account`, `/account/security`, and `/runtime-config.json` returned HTTP 200.
- Admin: `/`, `/access-denied`, and `/runtime-config.json` returned HTTP 200.
- Railway HTTP metrics after deployment showed no 5xx responses in the observed window.
- Runtime metrics were below limits in the observed one-hour window. The configured hard limits were CPU `1 vCPU`, memory `2 GB`, and one replica for every service. Peak observed memory was approximately `0.020 GB` per service; peak CPU was below `0.003` of one vCPU.

## Acceptance result

**PARTIAL SUCCESS**

The three frontend services build, deploy, start, pass health checks, and serve their real compiled applications within the required resource limits. The account authentication/API acceptance criterion remains **BLOCKED** because this Railway project contains no deployed platform API or valid API origin. Deploying an additional paid service was outside the authorized resource scope; the next safe step is to provision or attach the existing platform API under an explicitly approved origin and update `CAELORA_API_ORIGIN` for account/admin.
