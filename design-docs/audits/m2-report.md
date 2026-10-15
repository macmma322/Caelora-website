# Caelora M2 delivery report — 15 October 2026

## Baseline and Git

Started clean at `e373f571b90fbb945e0e0d811dc66233c91417ba` on feature/platform-foundation-v1. Re-read M1 engineering/verification, ADR, configuration, tokens, assets and backend boundaries; baseline npm run verify passed. The baseline branch remains at that commit for recovery. The website primary checkout is D:\Caelora-website; the Unity repository was not modified. No remote exists and nothing was pushed or publicly deployed.

| Branch / checkpoint                         | Commit                                                     |
| ------------------------------------------- | ---------------------------------------------------------- |
| Shared M2 plan                              | db7d27e (ten-point rendered audit and implementation plan) |
| feature/m2a-website-visual-refinement       | 6c7e0491b5161608325ee08229ae71e0acc7def2                   |
| feature/m2b-identity-foundation             | 58dca392acb9557f7e61388001b48848fde88737                   |
| feature/m2-integration, verified code merge | cffb4e0bb2e45b8fe675e5b9e0d09e2215cfb23a                   |

Each workstream had its own Git worktree and verification before two clean, explicit integration merges. This report and current documentation updates are a final separate documentation commit on the integration branch; `git rev-parse HEAD` identifies it. The workstream checkouts remain clean for review.

## IMPLEMENTED

Public site: actual production wordmark/compass O, brighter cinematic valley framing, concise hero, distinct exploration/building/survival/settlement/creature/freedom treatments, responsive navigation, configured account destination, genuine founding journal, structured footer and concept gallery with native dialog/keyboard support. Shared tokens provide semantic surfaces, forms, alerts, focus and reduced-motion rules for Astro/Angular. Original artwork/game files were read without modifications; optimized derivatives and source provenance are committed.

Compared with M1, recognition is immediate, warm architecture remains visible, copy has clearer hierarchy, sections vary their composition and gallery studies preserve their important silhouettes. The ten-point audit and actual before/after assessment are in [the plan](../product/m2-plan.md) and [visual assessment](m2-visual-assessment.md). Only three concepts exist; repeated valley framing is still a limitation, and rights approval/gameplay imagery remain prerequisites for publication.

Account platform: ASP.NET Core Identity + EF/Npgsql, immutable UUID user IDs, unique normalized email, framework password hashes, verified email before login, cookie sign-in/out, persistent server sessions, forgotten-password/reset, profile read/display-name editing and subject-scoped security/session overview. Angular uses real reactive forms, actual server responses/loading/errors and guards. No simulated success or browser-stored bearer credentials.

Database: explicit `20261015084239_IdentityFoundation` follows `202610150001_InitialPlatform`. Applied to the isolated developer PostgreSQL database; migration history was queried and rerunning migration reports up to date. Identity framework tables plus BrowserSessions/SecurityEvents are implemented, with foreign keys, unique indexes, bounded strings and UTC timestamps. Tests use separate generated databases, never developer-data resets.

Security: Secure HttpOnly host-only authentication cookie, 12-hour absolute default, durable protected keys, server validation on every authenticated request, logout replay rejection, password-reset session revocation, 30-minute scoped/replay-resistant links, exact credentialed CORS and Origin checks, framework CSRF header/cookie pairs, five-failure lockout and process-local network throttling. Development HTTP has a separately named local antiforgery cookie; production requires secure origins/key encryption. Production SMTP adapter requires authenticated STARTTLS. Details and operational tradeoffs: [identity decisions](../security/m2-identity.md).

Configuration: typed startup-validated Accounts options, ignored Development-only Identity.Local JSON, environment/CLI precedence, public Angular runtime configuration and optional Astro PUBLIC_ACCOUNT_URL. Native setup generates local secrets without printing them and preserves configuration/data. No production secret or redirect origin is embedded. [Configuration contract](../architecture/configuration-contract.md) and [local commands](../deployment/local-development.md) are updated.

## Verified evidence

| Check                                                         | Actual result                                                                                                                                                                      |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1 baseline npm run verify                                    | PASS                                                                                                                                                                               |
| M2A complete verification                                     | PASS; 16 Node + 23 baseline .NET tests                                                                                                                                             |
| M2B complete verification                                     | PASS; default .NET run 31 passed / 14 explicitly skipped without test connection                                                                                                   |
| M2B npm run test:identity                                     | PASS; 45 .NET tests / zero failures or skips against real PostgreSQL                                                                                                               |
| Integrated npm run verify with explicit PostgreSQL connection | PASS; 16 Node + 45 .NET, zero failures/skips; all three frontend builds, locked API build, types/lint/format, 106 local site references, repository/secret scan and Compose syntax |
| dotnet format --verify-no-changes --no-restore                | PASS                                                                                                                                                                               |
| npm audit --audit-level=high                                  | Zero reported vulnerabilities                                                                                                                                                      |
| NuGet direct/transitive vulnerability query                   | No known vulnerable packages reported by configured source                                                                                                                         |
| Integrated API readiness / capability                         | Healthy; accountsAvailable true                                                                                                                                                    |
| Applied migration history                                     | Both explicit migrations present; repeat migration is a no-op                                                                                                                      |
| Native browser account flow                                   | Real register → SMTP/Mailpit verify → sign-in → reload → profile update → security → logout → recovery email → reset → old password rejected → replacement accepted                |
| API outage/restart in browser                                 | Actual connection-error state; session/profile restored after restart                                                                                                              |
| Integrated standard-port browser flow                         | Website account link → fresh registration → Mailpit link targeting 4200 → confirmation → login → reload/security; all actual local services                                        |
| Responsive visual inspection                                  | 1920×1080, 1440×900, 768×1024, 390×844; no horizontal overflow; mobile account also checked                                                                                        |
| Keyboard interactions                                         | Gallery ArrowRight, Escape/focus return; mobile disclosure Escape/focus return                                                                                                     |

Ignored evidence directory: D:\Caelora-website\artifacts\m2. Logs: m2a-verification.log, m2b-verification.log, identity-verification.log, integrated-verification.log, integrated-migrations.log. Before/after hero screenshots: before/home-{1920,1440,768,390}.jpg and after/home-{1920,1440,768,390}.jpg. Other captures: after/home-full-1440.jpg, home-full-390.jpg, gallery-mobile.jpg, account-overview.jpg, account-mobile.jpg, account-security.jpg, account-reset.jpg and account-offline.jpg. Screenshots are real browser output, stored locally rather than committed with synthetic account data. [Identity verification](m2-identity-verification.md) records coverage and corrected browser defects.

## DOCUMENTED

All nine requested [future data contracts](../architecture/future-platform-contracts.md): GameEntitlement, EntitlementSource, LinkedExternalIdentity, TrustedDevice, GameplayLease, PurchaseRecord, SecurityEvent, Notification and WorldBackup. Source grants converge on the same entitlement; Steam owners do not pay twice; immutable account ownership, backend launcher authorization, multiple signed-in devices, separate gameplay concurrency, bounded offline single-player and IP-change tolerance are explicit. Only current Identity/browser session/audit functionality received tables.

## BLOCKED / unverified

Docker runtime: installed Desktop 4.85.0, CLI 29.6.2, Compose 5.3.1, selected desktop-linux. Backend log identifies inference-manager startup failure accessing/removing its dockerInference unix-socket entry, reporting invalid path syntax. This predates the earlier policy-rejected diagnostic wrapper. No security bypass, factory reset, socket deletion or repeated rejected command was attempted. Compose syntax passes; container build/startup and Redis runtime checks do not have a local PASS. Native PostgreSQL/Mailpit provided independent genuine validation. No GitHub CI run was launched.

Production SMTP delivery, HTTPS ingress, certificate/key rotation/restore and public deployment were not exercised. Browser API lacks OS reduced-motion emulation; CSS treatment is implemented but not runtime-certified. This is not a complete WCAG or penetration-test certification.

## NOT STARTED

Steam login/linking, entitlements/business logic, payments, launcher authorization/distribution, gameplay/offline leases, trusted-device management, individual remote session termination, MFA, notification outbox/inbox, backups, multiplayer/community and privileged admin APIs. No fake buttons claim these capabilities.

## Launch and next milestone

```powershell
Set-Location D:\Caelora-website
npm ci
npm run bootstrap
npm run infra:native
pwsh -NoProfile -File scripts/dev-api.ps1 -Migrate
npm run test:identity
```

Set public `PUBLIC_ACCOUNT_URL=http://localhost:4200` in apps/web/.env (already configured in this checkout). Run separately: `npm run dev:web` (4321), `npm run dev:account` (4200), `npm run dev:api` (5080), optional `npm run dev:admin` (4300). Mailpit: http://localhost:8025. Native PostgreSQL: loopback 55432. The default-port services are left running for review. Avoid running a second instance or Compose on occupied ports. Local state and generated credentials are under ignored artifacts/local-platform; preserve it.

Recommended M3: release hardening before commerce—durable mail outbox/retry, MFA/step-up plan, retention/session cleanup, operator recovery/alerts and real HTTPS staging/container verification. Then implement a small entitlement proof with provider test credentials. Current risks are synchronous mail/timing differences, process-local rate limits, database reads on authenticated requests, unfinished operational policies and unapproved publication rights. No microservices or speculative marketplace expansion is needed.
