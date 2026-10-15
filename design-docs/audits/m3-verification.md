# M3 verification and delivery — 15 October 2026

M3 implements durable security delivery, authenticator MFA, session control and a persisted inbox. This is a local verified milestone, not production readiness or a public deployment.

## Repository and checkpoints

Starting branch feature/m2-integration, clean HEAD `08dde742a46882ea8b7d8760a69e81e3a0300f71`. Work continues on feature/m3-security-and-reliability. M2 integration remains unchanged; no push, remote creation or public deployment. Unity and unrelated projects were not edited.

- `7d7431a`: baseline audit and M3 implementation plan.
- `003e650`: transactional notification delivery, Identity MFA, browser session controls, notification API/Angular screens and first M3 migration/tests.
- `be57015`: operational/transport/key hardening, protected local state, second migration, strict-CSP fixes and HTTPS/recovery verification.
- The final delivery response identifies ending HEAD; this report is part of the final documentation commit.

Backend changes live in Accounts (Identity integration, MFA/session operations/key probe), Notifications (templates, protected outbox, worker, retention), Configuration/TransportOptions, Program and EF migrations. Angular account API/routes/shell and security/MFA/notification screens extend the existing design tokens. Build/CSP promotion and local HTTPS/recovery scripts are updated; qrcode is a pinned runtime dependency, otpauth and Otp.NET are test-only code generators. No extra authentication architecture or microservice was added.

## Classification

| Status      | Outcome                                                                                                                                                                                                                                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IMPLEMENTED | PostgreSQL transactional outbox, protected snapshots, leased claims, retry/jitter/expiry/Dead/operator retry, HTML+plain email; real Identity TOTP and one-use recovery; recent proof; revocation/last seen; persisted paginated inbox; bounded cleanup; proxy/key/replica validation; local HTTPS helpers. |
| VERIFIED    | Native PostgreSQL/Mailpit, real-browser MFA/recovery/inbox/session actions, trusted HTTPS, cookie/CSRF/CORS/Origin checks, remote-cookie rejection, API restart persistence, isolated dump/restore and test-key recovery/rotation. Exact evidence below.                                                    |
| BLOCKED     | Docker Desktop container runtime, due to the existing inference-manager startup failure. Redis/container dependency runtime was not claimed. No reset/volume/socket deletion or repeated rejected diagnostics.                                                                                              |
| DOCUMENTED  | Shared-key and external-throttle deployment strategy, SMTP failure/retry recovery, retention defaults, key/certificate recovery limits and staging gates. Documentation does not constitute runtime verification.                                                                                           |
| NOT STARTED | Public staging/production, distributed limiter deployment, real SMTP mailbox/DNS rollout, passkeys/support recovery, Steam, payments, entitlements, launcher/native distribution, DRM, gameplay leases/concurrency and multiplayer/world storage.                                                           |

## Database preservation

Two explicit additive M3 migrations follow M2's existing migrations:

- `20261015110857_M3SecurityReliability`: outbox, inbox, MFA challenge/replay-proof tables; browser descriptors/activity/recent-auth/MFA flags; pending-enrollment expiry. Existing sessions receive conservative Browser/creation-time backfill.
- `20261015141816_UniqueSecurityNotification`: unique nullable security-event reference for inbox deduplication.

Foreign keys, bounded strings and processing/ownership/retention indexes are present. Disposable PostgreSQL integration databases were migrated and tested before the native developer database. Native migration completed with developer accounts/data and existing Mailpit/key/config state preserved. No down migration, reset or account-table truncation. The native cluster is on loopback 55432; unrelated PostgreSQL 5432 remains untouched.

## Automated evidence

Baseline root verification with real PostgreSQL passed sixteen Node and 45 .NET tests, zero skipped/failed (`artifacts/m3/baseline.log`). Existing tests remain; the old SMTP-failure assertion now checks intended queued registration, durable failure and recovery instead of synchronous 503 behavior.

Before the final pass, 79 .NET cases passed with zero skipped/failed. Two further targeted cases exercise malformed key XML startup rejection and five-minute last-seen write throttling. Final integrated verification results are recorded after execution below.

Coverage includes outbox transaction rollback, uniqueness, success/scrub, transient/permanent failure, expiration, bounded attempts, new-host recovery, abandoned claims and competing processors; MFA enrollment/first-code rejection, real activation, encrypted token values, password-only denial, challenge/TOTP replay, challenge expiry/lockout, recovery consumption/reuse/replacement, disable/stamp/session invalidation; session expiry/foreign ownership/revocation; inbox persistence/authorization/pagination/read state; configuration/proxy spoofing; database readiness failure without secret disclosure; bounded cleanup; valid session/key rotation and copied-key decryption.

Full npm production and development dependency audits returned zero known vulnerabilities. NuGet audit including transitives reported no vulnerable packages from current sources (`npm-full-audit.json`, `npm-production-audit.json`, `nuget-audit.log`). These are point-in-time package advisories, not a proof of absence of vulnerabilities.

`scripts/verify-local-https.mjs` passed real network flows with generated test accounts and default rate limits (`artifacts/m3/https-network.log`): queued branded multipart email via Mailpit; HTTPS verification/reset frontend routes; real confirmation/reset; Secure/HttpOnly/host-only/Path=/SameSite=Lax session cookie; exact credentialed CORS; missing-CSRF and wrong-Origin 403; no cross-origin read grant; API headers; activation using a real TOTP; pending MFA no private access; two independent recovery-authenticated cookies; remote revoked cookie 401; current cookie preserved; inbox/read; logout 204 and subsequent 401.

`pwsh -NoProfile -File scripts/verify-local-recovery.ps1` passed native pg_dump/pg_restore of the current schema and synthetic security event in two separate internally generated disposable databases (`artifacts/m3/backup-restore.log`). This did not copy/reset developer data. It is not a measured production disaster-recovery exercise.

## Browser and HTTPS evidence

The user approved the Windows localhost development-certificate trust prompt. `dotnet dev-certs https --check --trust` confirms trust. Browser TLS warnings were never bypassed. Real production account assets run on https://localhost:4443 with API https://localhost:7443.

Actual browser journey: generated local registration → queued/delivered Mailpit HTML email → email confirmation → password login → real provisioning QR/manual key → first-code activation → ten one-time recovery codes → signed out → HTTPS password/MFA challenge → fresh TOTP → real profile/security state. An independent Chrome session signed in using a recovery code, reducing the count to nine. The IAB “sign out other sessions” action reported one ended session; the independent HTTPS network probe verifies rejection of terminated cookies. The browser also retained its valid session across Release API restart and displayed persisted notifications; mark-all changed five unread to zero.

1440×900 desktop and 390×844 mobile security layouts were inspected. Mobile document width did not overflow. Native confirmation Cancel received focus; Escape closed it and returned focus to its trigger. The browser exposed and verified fixes for Angular inline critical-CSS/CSP incompatibility and conditional-dialog initial focus. Existing reduced-motion CSS is retained; a complete assistive-technology audit is still a staging task.

Local screenshots (ignored artifacts, no secrets/codes):

- artifacts/m3/security-desktop.png
- artifacts/m3/security-mobile.png
- artifacts/m3/notifications-desktop.png
- artifacts/m3/session-confirmation.png

Setup secrets, recovery codes and private action URLs were kept out of screenshots/reports. Public-site visual redesign was not repeated in M3.

## Remaining risks and M4 prerequisites

SMTP acceptance plus crash can duplicate delivery. TOTP is phishable and recovery codes confer full sign-in authority. Losing all MFA proofs has no email-only bypass; design a reviewed support recovery policy before public use. Coarse descriptors are spoofable hints and may miss a genuinely new browser. Offset pagination can shift during arrivals. Cleanup defaults need legal/privacy/audit review. Dependency scans and local tests do not replace security review or load testing.

Process-local network limits require single-instance deployment or a verified shared edge limiter before scaling. The replica flag is an acknowledgement only. Shared certificate-encrypted keys on multiple hosts, actual reverse proxy, public DNS/cert renewal, non-loopback SameSite/browser coverage, production SMTP/DNS/mailboxes and encrypted off-machine database+key recovery still require staging. Retain old keys; the current PFX loader has no wrapping-certificate overlap chain. Confirm operator monitoring, RPO/RTO, least-privilege secret/DB access, account deletion/retention and incident response before M4 external integrations.

## Exact local commands

From D:\Caelora-website, inspect listeners before starting duplicates:

```powershell
npm run infra:native
pwsh -NoProfile -File scripts/dev-api.ps1 -Migrate
npm run dev:api
npm run dev:web
npm run dev:account
npm run dev:admin
npm run test:identity
```

HTTP developer ports: website 4321, account 4200, admin 4300, API 5080, Mailpit 8025/SMTP 1025, PostgreSQL 55432. HTTPS setup/start and staging gates are in [HTTPS validation](../deployment/https-staging-validation.md); CLI recovery is in [operational recovery](../deployment/operational-recovery.md). New features/configuration are specified in [MFA](../security/m3-authentication-and-mfa.md), [sessions](../security/m3-session-management.md), [outbox](../architecture/notification-outbox.md) and [configuration](../architecture/configuration-contract.md).

## Final integrated pass

`npm run verify` with CAELORA_TEST_POSTGRES supplied from the preserved native connection passed: formatting, zero-warning lint, TypeScript/Astro checks, sixteen Node tests, all frontend builds, four static pages/106 references, 55 documentation links, locked Release .NET build (zero warnings/errors), 81 .NET tests (zero failures/skips), source secret scan and Compose syntax. Evidence: artifacts/m3/final-verify.log. `dotnet format --verify-no-changes --no-restore` also passed (dotnet-format.log).

After the integrated run, the generated local secret/key ACL helper was added and exercised. Certificate export, key directory, connection file and Identity.Local JSON now restrict Windows access to the current user, SYSTEM and Administrators without changing contents. All PowerShell scripts parse; repository/secret checks pass with 184 source files. Native developer migration history confirms all four expected migrations. Package audits remain advisory snapshots, and Compose success remains syntax-only.

A machine-level Windows Installer operation temporarily removed .NET SDK/runtime files after the passing run. The user did not initiate it; its cause was not established and no machine installation was reset/reinstalled by this task. SDK 10.0.402 then became available under the existing latestPatch policy. All 81 PostgreSQL-backed .NET cases were rebuilt and passed again with zero failures/skips (`post-update-identity.log`). The outbox status command then reported 22 Delivered messages and no Dead/Retry rows (`outbox-status.log`). This is a local snapshot, not a delivery SLO.
