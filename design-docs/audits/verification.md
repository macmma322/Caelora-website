# Foundation verification — 2026-10-15

This record covers `D:\Caelora-website`. PASS means a command or browser check actually completed; workflow definitions and planned integrations are not execution evidence. Final results are updated after the verification run.

Final root command: **PASS — npm run verify**, exit 0. It includes 16 Node tests, 23 ASP.NET tests, all three frontend builds, 93 local site references, 22 local documentation links, locked .NET restore/build, lint/format/types, secret patterns and Compose syntax. Server build had zero warnings/errors. Successful live Docker dependency/container tests remain blocked and are not part of this PASS.

| Area                                                                     | Status  | Evidence                                                                                                                 |
| ------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| Reference audit                                                          | PASS    | Named repositories inspected read-only; no reference edits performed                                                     |
| Frontend dependency installation                                         | PASS    | npm install completed; versions locked; no global tool installation                                                      |
| Astro strict checks and production build                                 | PASS    | Four generated pages, robots/sitemap and committed local assets                                                          |
| Angular account/admin compilation                                        | PASS    | Independent optimized standalone builds; strict compiler/templates                                                       |
| Runtime config/client tests                                              | PASS    | 16 Node tests; invalid JSON/config/contract fail closed                                                                  |
| API restore/build                                                        | PASS    | .NET 10.0.401, net10.0, zero warnings/errors after alignment of EF package versions                                      |
| API integration/unit suite                                               | PASS    | 23 tests, including negative startup and real unavailable-dependency readiness                                           |
| Static assets/links                                                      | PASS    | Four HTML pages, 93 checked local references/fragments, with inline script/style rejection for CSP                       |
| Lint                                                                     | PASS    | ESLint 10 with strict TypeScript rules                                                                                   |
| npm and NuGet advisories                                                 | PASS    | No reported vulnerabilities from current sources at audit time                                                           |
| Source secret patterns                                                   | PASS    | Recognized patterns/forbidden local files scan; not a comprehensive secret audit                                         |
| Compose syntax                                                           | PASS    | docker compose config --quiet against safe .env.example                                                                  |
| Local Docker engine                                                      | BLOCKED | Installed CLI/Desktop; engine initially stopped, Desktop start attempted, subsequent engine API requests did not respond |
| Container image tag existence                                            | PASS    | Docker Hub API confirmed postgres:18.4-alpine and redis:8.2.7-alpine                                                     |
| PostgreSQL/Redis containers, live migration, successful dependency smoke | BLOCKED | Engine unavailable; no claim of successful container startup/connectivity                                                |
| API container build/run                                                  | BLOCKED | Docker engine unavailable; Dockerfile not locally executed                                                               |
| Browser desktop                                                          | PASS    | Actual Chromium/IAB page inspected at 1440×1000; correct hero/metadata, one H1, no horizontal overflow                   |
| Browser mobile                                                           | PASS    | Actual 390×844 viewport; no overflow; menu opens, Escape closes and restores focus                                       |
| Mobile screenshot                                                        | PASS    | artifacts/screenshots/mobile-390.png, ignored local evidence                                                             |
| Automated accessibility audit / cross-engine support                     | NOT RUN | Manual semantics/focus checks are not WCAG certification; no Firefox/Safari validation                                   |
| GitHub CI                                                                | NOT RUN | SHA-pinned workflow written; repository remains local with no remote                                                     |
| Production hosting/Steam/Stripe/email/launcher                           | NOT RUN | Explicitly outside milestone; no fake integration                                                                        |

## Additional acceptance checks

- PASS: Angular welcome/sign-in/unavailable security/not-found browser routes. The account shell fetched the real local API successfully. The admin shell contains no forms or privileged data.
- PASS: tablet viewport 768×1024, no horizontal overflow; media navigation reached its target and all seven image instances loaded.
- PASS: staging runtime JSON/header promotion preserved compiled JavaScript SHA-256 hashes.
- PASS: production Astro build accepted a reserved HTTPS test origin and rejected a localhost origin.
- PASS: dotnet format --verify-no-changes and current npm/NuGet advisory checks.
- Corrected during review: inline Astro navigation script versus strict CSP, and unsupported --locked-mode on dotnet build (locked restore uses RestoreLockedMode=true).

## Known limitations and release gates

Docker is the principal runtime validation blocker. Fix the local Linux engine, then run Compose, explicit migrations, the opt-in dependency smoke and API container build before claiming full infrastructure acceptance. Source contains a CI job for disposable PostgreSQL/Redis, but it has not run on GitHub here.

A later timed engine-probe wrapper was rejected by automatic approval review with only “blocked by policy”; it did not run. Earlier normal Docker engine calls hung after Desktop startup. No security settings or Docker configuration were weakened to pursue validation.

No authentication, authorization policies, commerce or ownership checks exist. Sensitive account/admin API paths do not exist, and the Angular applications render only public explanations. Implement identity and real server-side authorization before introducing sensitive UI. Asset provenance is recorded; commercial rights for concept sheets require publisher confirmation. The provisional wordmark/ornament needs brand approval. No remote or public deployment was created.

Node's npm 12 blocked four package lifecycle scripts by default. Prebuilt dependencies worked in local builds; no blanket script approval was added. Dependency compatibility and image tags were checked, but container reproducibility is unverified until execution.

Screenshots are local ignored artifacts, not proof of production hosting. Local browser dev pages were inspected; static output links/assets were checked separately. Staging/production origins in tests use reserved example domains and are not proposed real domains.
