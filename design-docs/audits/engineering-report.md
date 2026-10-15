# Caelora platform foundation engineering report

Date: 2026-10-15. Workspace: **D:\Caelora-website**. Independent local Git repository; no remote, public repository, deployment or domain created. The Unity project remains separate and unmodified by this task.

## Result

PASS: a coherent Astro/Angular/.NET foundation is implemented and runs locally. BLOCKED: live Docker dependency/container acceptance; the installed Linux engine did not respond. The milestone is therefore complete for local application behavior, with infrastructure runtime verification outstanding. Do not call it a production-ready commercial platform.

## Reference audit and decision

Inspected Zone-32-19, USSX-Stemini, USSX-Stemini-dev, Malrynth, J.A.R.V.I.S and the Caelora game/art directories read-only. Reused principles: explicit configuration validation, shared contract/tokens packages, backend authorization boundaries, migration ownership, reproducible root checks, pinned read-only CI actions. Rejected submodule topology, custom SSO implementation reuse, unrelated domain logic and large dependency sets. See [comparison audit](existing-project-patterns.md) and [ADR-001](../decisions/ADR-001-repository-architecture.md).

Selected one monorepo with independent application artifacts. It allows atomic changes to contracts/API/UI while preserving separate deployment schedules. There is no demonstrated repository-permission requirement that justifies submodules now. No nested repository or Unity submodule is created.

## Generated source tree

```text
D:\Caelora-website
├── .github/workflows/verify.yml
├── apps
│   ├── web
│   │   ├── public/{media,fonts,favicon.svg,_headers}
│   │   ├── src/components/SectionHeading.astro
│   │   ├── src/layouts/SiteLayout.astro
│   │   ├── src/pages/{index,404,project-information}.astro
│   │   ├── src/pages/journal/foundation.astro
│   │   ├── src/pages/robots.txt.ts
│   │   └── src/styles/site.css
│   ├── account/{public,src/features,src/routes.ts,src/shell.ts,src/main.ts}
│   ├── admin/{public,src/routes.ts,src/shell.ts,src/main.ts}
│   └── portal.css
├── services/platform-api
│   ├── Application/PlatformInformation.cs
│   ├── Configuration/PlatformOptions.cs
│   ├── Contracts/PlatformInfoV1.cs
│   ├── Infrastructure/{PlatformDbContext,DependencyReadiness}.cs
│   ├── Infrastructure/Migrations
│   ├── Program.cs
│   ├── appsettings{,.Development}.json
│   ├── Caelora.Platform.Api.csproj
│   └── packages.lock.json
├── packages
│   ├── design-tokens/{tokens,base}.css
│   ├── api-client/src/{index.ts,config.mjs,portal-bootstrap.ts}
│   └── shared-assets/{asset-manifest.json,README.md,licenses}
├── infrastructure/docker/{compose.yml,PlatformApi.Dockerfile}
├── design-docs/{architecture,decisions,security,product,deployment,audits}
├── scripts
│   ├── bootstrap.ps1
│   ├── dev-api.ps1
│   ├── prepare-assets.mjs
│   ├── scan-secrets.mjs
│   ├── verify-site.mjs
│   ├── verify-repository.mjs
│   ├── verify-dependencies.mjs
│   └── write-runtime-config.mjs
├── tests
│   ├── runtime-config.test.mjs
│   ├── api-client.test.mjs
│   └── platform-api/{FoundationTests.cs,Caelora.Platform.Api.Tests.csproj,packages.lock.json}
├── Caelora.Platform.slnx
├── Directory.Build.props
├── global.json / NuGet.Config
├── angular.json / tsconfig.json
├── package.json / package-lock.json
└── README.md / CONTRIBUTING.md / repository configuration files
```

This summarizes actual source, not future empty folders. Generated/ignored outputs also exist: apps/web/dist, dist/account/browser, dist/admin/browser, .NET bin/obj, local .env/config files and artifacts/screenshots/mobile-390.png.

## Exact selected versions

| Component                                           | Version                                                       |
| --------------------------------------------------- | ------------------------------------------------------------- |
| Node / npm                                          | 24.19.0 / 12.0.2                                              |
| Astro / check / sitemap                             | 7.3.8 / 0.9.10 / 3.7.4                                        |
| Angular framework / compiler-cli                    | 22.2.3                                                        |
| Angular CLI / build                                 | 22.2.2                                                        |
| TypeScript / RxJS / tslib                           | 6.0.3 / 7.8.2 / 2.8.1                                         |
| .NET SDK / target                                   | 10.0.401 / net10.0                                            |
| Installed ASP.NET/.NET runtime used locally         | 10.0.12                                                       |
| ASP.NET OpenAPI / MVC testing / EF Core / EF Design | 10.0.13                                                       |
| Npgsql EF provider / StackExchange.Redis            | 10.0.3 / 3.4.5                                                |
| xUnit / Visual Studio runner / Test SDK             | 2.9.3 / 4.0.1 / 18.11.0                                       |
| ESLint / typescript-eslint                          | 10.12.0 / 8.71.2                                              |
| Prettier / Astro formatter                          | 3.9.10 / 1.1.1                                                |
| sharp / Manrope font package                        | 0.35.5 / 5.3.0                                                |
| Docker CLI / Compose                                | 29.6.2 / v5.3.1                                               |
| Declared PostgreSQL / Redis images                  | 18.4-alpine / 8.2.7-alpine; tags verified, containers not run |

Manifests and lockfiles include exact direct/transitive dependency resolution. No global tools installed locally. npm 12 script restrictions remain enabled.

## Implemented website and assets

Hero and exploration CTA, introduction, landscape feature, building/survival, creatures/dragon concept, villages/guilds/kingdoms, player freedom, one real founding journal note, concept gallery, footer/status/legal-readiness pages and branded 404. Semantic navigation, keyboard focus, native mobile menu, Escape focus restoration, reduced motion, local fonts, metadata/canonicals, sitemap/robots, optimized WebP and lazy loading. No fake release, sales, gameplay footage, dates, prices or community links.

Existing valley master, dragon sheet and atlas concept derivatives were reused; Cinzel with OFL and pinned self-hosted Manrope provide typography. Source hashes/crops/dimensions are recorded. No source artwork was modified. Commercial rights for concepts and a clean official logo/sigil remain release-review items; the web mark is provisional. See [asset provenance](../../packages/shared-assets/README.md).

## Implemented services and configuration

API: public versioned capability contract, OpenAPI, JSON structured logs, sanitized errors/trace IDs, startup-validated options, liveness, dependency readiness with enabled flags, PostgreSQL EF context and explicit baseline migration, lazy Redis PING integration, exact-origin read-only CORS and process-local rate limiting. Integration tests require no live provider secrets.

Angular: separate branded shells, welcome/sign-in information, unavailable account route structure, access-denied/not-found presentations, strict public runtime config before bootstrap and a real public API connection check. No private data, fake session or admin privilege exists.

Configuration: safe local examples, ignored random-password bootstrap, normal .NET providers plus validated options, Astro build-time public origins, Angular runtime JSON with no-store/content-type checks. Promotion script changes runtime JSON/CSP without changing Angular JS hashes. Staging/production require HTTPS origins and enabled configured data dependencies; missing mandatory server options fail startup. Full [configuration contract](../architecture/configuration-contract.md).

## Run commands

From D:\Caelora-website: `npm ci`, `npm run bootstrap`, `dotnet restore Caelora.Platform.slnx --locked-mode`. In separate terminals:

| Application  | Command             | Local URL                              |
| ------------ | ------------------- | -------------------------------------- |
| Astro        | npm run dev:web     | http://localhost:4321                  |
| Account      | npm run dev:account | http://localhost:4200                  |
| Admin        | npm run dev:admin   | http://localhost:4300                  |
| API          | npm run dev:api     | http://localhost:5080                  |
| Dependencies | npm run infra:up    | Loopback PostgreSQL 55432, Redis 56379 |

For dependencies, first bootstrap with -EnableDependencies and explicitly migrate; see [local commands](../deployment/local-development.md). Root verification: `npm run verify`. No application requires global framework CLIs.

## Verification and remaining work

See [detailed verification](verification.md). Passing checks include 16 Node tests, 23 .NET tests, all frontend builds/types/lint, static links/assets, local documentation links, no nested repositories, configuration negative tests, runtime promotion hash preservation, Compose syntax and dependency advisories. Actual desktop/mobile browser and Angular/API interaction checks were performed; automated accessibility/cross-engine auditing and GitHub CI execution were not claimed.

BLOCKED: engine-backed PostgreSQL/Redis startup, successful live dependency smoke and API Docker build/run. NOT RUN: deployment, provider integrations, production security exercise. All intended features outside milestone remain unavailable.

Architectural risks: concept rights not confirmed; identity remains unimplemented; process-local rate limits require edge/shared controls before scale; proxy trust and actual hosts require deployment policy; no instant offline revocation/global concurrency guarantee is possible; scripts/CI need Linux execution evidence from a real CI run. Next milestone: verified identity, secure browser sessions and recovery with real sandbox email, not commerce or community expansion.

Git branch: feature/platform-foundation-v1. The final verified local commit SHA is reported in the chat after commit; keeping a commit's own hash inside its content would require another commit. No remote is configured.
