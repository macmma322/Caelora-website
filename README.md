# Caelora platform

The public website and future commercial/account ecosystem for an independent native Unity 6 medieval-fantasy voxel sandbox. The Unity game remains in its own repository and does not depend on this frontend code.

**M3 milestone:** the M2 website/account foundation now includes a PostgreSQL transactional email outbox, real authenticator MFA/recovery codes, browser-session revocation, persisted security notifications and bounded retention. Native PostgreSQL/Mailpit and trusted local HTTPS are exercised. Container runtime and public staging remain unverified. Purchases, Steam linking, launcher distribution and privileged admin operations remain absent. Nothing is deployed publicly. See [M3 verification](design-docs/audits/m3-verification.md), [HTTPS commands](design-docs/deployment/https-staging-validation.md) and the historical [M2 report](design-docs/audits/m2-report.md).

## Start locally

Prerequisites: Node **24.19.0**, npm **12.0.2**, .NET SDK **10.0.401**, PowerShell 7. Docker is optional for frontend/basic API use.

```powershell
Set-Location D:\Caelora-website
npm ci
npm run bootstrap
dotnet restore Caelora.Platform.slnx --locked-mode
npm run dev:web
```

Use separate terminals for each:

| Application                       | Command             | Address                                       |
| --------------------------------- | ------------------- | --------------------------------------------- |
| Public website                    | npm run dev:web     | http://localhost:4321                         |
| Account application               | npm run dev:account | http://localhost:4200                         |
| Administrative access information | npm run dev:admin   | http://localhost:4300                         |
| Platform API                      | npm run dev:api     | http://localhost:5080                         |
| Optional dependencies             | npm run infra:up    | PostgreSQL 55432 / Redis 56379, loopback only |

The API exposes `/api/v1/platform`, health/readiness and Development/Testing OpenAPI. Accounts are explicitly opt-in; their routes require PostgreSQL, durable keys and configured mail. Unimplemented sensitive endpoints remain absent. See [API boundaries](design-docs/architecture/api-boundaries.md).

For the verified Windows identity setup (PostgreSQL 18 binaries installed), run `npm run infra:native`, then `pwsh -NoProfile -File scripts/dev-api.ps1 -Migrate` before starting the API. Open Mailpit at http://localhost:8025 for local verification/reset links. Set public `PUBLIC_ACCOUNT_URL=http://localhost:4200` in apps/web/.env. Run `npm run test:identity` for the real PostgreSQL suite; default verification skips those cases without an explicit test connection. See [local development](design-docs/deployment/local-development.md).

For dependencies, run `pwsh -NoProfile -File scripts/bootstrap.ps1 -EnableDependencies`, start infrastructure, apply the explicit migration with `pwsh -NoProfile -File scripts/dev-api.ps1 -Migrate`, then start the API. Existing local files are preserved, and generated credentials are never printed. See [local development](design-docs/deployment/local-development.md) for container commands and details.

## Verify

```powershell
npm run verify
```

Includes formatter, lint, types, Node tests, Astro/Angular builds, site links/assets, .NET locked build/tests, source secret patterns and Compose syntax. Real dependency smoke is separate: `npm run test:dependencies` with explicit disposable connections. Browser evidence and actual Docker test status are in the [verification record](design-docs/audits/verification.md). Workflow files do not mean CI has run.

## Boundaries

- `apps/web`: Astro/TypeScript/scoped CSS; static output and minimal navigation script.
- `apps/account`, `apps/admin`: independent strict Angular standalone builds with validated public runtime configuration; no mock identity/privileges.
- `services/platform-api`: .NET 10 modular foundation, typed options, OpenAPI, PostgreSQL/EF migration and Redis readiness.
- `packages`: shared tokens, public API contracts/client/config, asset provenance/licenses.
- `infrastructure/docker`, `scripts`, `tests`, `.github`: repeatable development and verification.
- `design-docs`: decisions, security, product direction, deployment and evidence.

One monorepo, independent application releases, no submodules: [ADR-001](design-docs/decisions/ADR-001-repository-architecture.md). Future launcher code will be native C#/Avalonia with standards-based browser login; no empty launcher project is created now.

## Read before extending

[Platform overview](design-docs/architecture/platform-overview.md) · [Repository boundaries](design-docs/architecture/repository-structure.md) · [Configuration contract](design-docs/architecture/configuration-contract.md) · [API boundaries](design-docs/architecture/api-boundaries.md) · [Identity/entitlements/sessions](design-docs/security/identity-entitlements-and-sessions.md) · [Deployment](design-docs/architecture/deployment-environments.md) · [Reference audit](design-docs/audits/existing-project-patterns.md) · [Design foundation](design-docs/product/design-system.md) · [Roadmap](design-docs/product/implementation-roadmap.md) · [Asset provenance](packages/shared-assets/README.md).

Public config is browser-visible; real .env, Local JSON and runtime JSON are ignored. Production startup rejects absent/unsafe mandatory API configuration. Artwork is existing project/user concept material and needs rights confirmation before public publication. No website remote is configured; do not push this project to the Unity game's remote.

## M3.5 visual experience

The public site now follows an illustrated expedition through landscape, hearth, wildlife, dragons and player freedom. Native scroll-driven depth has static mobile/reduced-motion/no-script fallbacks. Actual falcon/wolf source-model renders supplement the concept archive. Angular account pages use the same tokens and fonts with a quieter operational layout. See [M3.5 verification](design-docs/audits/m3-5-verification.md), [visual direction](design-docs/design/caelora-visual-direction.md), [shared design system](design-docs/design/design-system.md) and [motion contract](design-docs/design/m3-5-motion-system.md). Commercial artwork rights, physical-device QA and the mobile LCP target remain publication work.

Optional browser regression: install/use an approved Playwright runtime outside the source dependency graph, set `CAELORA_PLAYWRIGHT_MODULE` to its module specifier (a `file:///` URL for an absolute Windows path), and run `node scripts/verify-design.mjs` against `CAELORA_DESIGN_URL`. Screenshots/results default to ignored `artifacts/design-evolution/verify`. Normal builds require no Blender/source-model access; web derivatives and licenses are committed.

## M3.6A account & UI design system finalization

Account, auth, and portal interfaces have been finalized with a unified typographic system (Cinzel display, EB Garamond body/controls, removal of Manrope from visible UI), restrained medieval/product geometry tokens (4px controls, 6px cards, 8px dialogs), normalized button variants and states, explicit form labeling with show/hide password toggles, signed-in identity header disclosure with keyboard focus management, responsive mobile subnavigation, profile dirty-state tracking, and reusable destructive confirmation dialogs. Complete real-flow verification confirms 0 Axe accessibility violations across 7 viewports (1920 to 320px) and passes all real PostgreSQL authentication and session flows. See [M3.6A verification](design-docs/audits/m3-6a-verification.md).

## Design evolution (One valley)

The public site is restructured into ten acts, each set in a different art-directed detail of the one valley master, with a systems overview, an honest development-status vocabulary shared by all three apps, a Markdown journal collection with an index and RSS feed, a `/media/` archive and a poster-first 3D showcase. The account portal checks `/api/v1/platform` and pauses its forms with a truthful notice when account services are not open; the admin app becomes the restricted Caelora Studio shell. See [direction](design-docs/design/design-evolution-direction.md), [Studio architecture](design-docs/design/caelora-studio-architecture.md) and [verification](design-docs/audits/design-evolution-verification.md). To add a journal entry, add one Markdown file to `apps/web/src/content/journal/`; to add an image, add derivatives to `apps/web/public/media/` and one entry to `apps/web/src/data/media.ts`.
