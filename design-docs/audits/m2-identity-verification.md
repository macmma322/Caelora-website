# M2 identity verification — 15 October 2026

## Environment and evidence

Real isolated PostgreSQL 18.6 runs on loopback 55432; the workstation's pre-existing PostgreSQL service/database was not modified. The developer caelora database received both explicit migrations through the API migration command. Identity tests create separate internally named databases and drop those only. Mailpit v1.31.6 runs on loopback SMTP 1025 / UI 8025 with durable ignored local state. No EF InMemory provider is used.

`npm run verify` passes formatting, lint, types, 16 Node tests, all three frontend builds, static asset/link checks, repository checks, locked .NET build, baseline/configuration tests, source secret scan and Compose syntax. Without a test connection its .NET result is 31 passed / 14 explicitly skipped. `npm run test:identity` supplies the real native connection internally and runs 45 passed / 0 failed / 0 skipped. This distinction is intentional; the default skip is not claimed as identity coverage. Raw logs are ignored local artifacts under the primary checkout's artifacts/m2.

The 14 PostgreSQL cases exercise normalized-email duplicates, framework hashes, password/name validation, required/single-use/expired verification, incorrect and successful login, authenticated/unauthorized profile reads, profile persistence, secure cookie attributes, logout plus cookie replay rejection, password reset plus old-password rejection/all-session revocation, CSRF/untrusted origins, 429 throttling, five-attempt account lockout, isolation of another account's audit event, host-restart cookie persistence, Development HTTP antiforgery and real failure handling when a test SMTP adapter throws. The sender replacement is confined to tests; actual browser flows below use SMTP.

Eight additional configuration cases cover valid local mail, required PostgreSQL, four unsafe account origins, nonlocal Mailpit/key-encryption rejection and invalid session/key-storage settings. Existing M1 tests remain intact except the migration assertion now expects the actual Identity schema as well as the baseline.

## Actual browser flows

Against the running Angular application, API, PostgreSQL and Mailpit: registered a generated synthetic caelora.test address; opened the actually delivered verification email; confirmed it; signed in; reloaded successfully; saved a new display name; read actual session/audit activity; signed out; requested recovery; opened the real reset email; reset the synthetic account's password; observed the old password rejected and replacement accepted. No production/user account was used.

Stopping the owned API process and reloading a protected account route produced the real connection-unavailable page. Restarting the API and using Try again restored the existing session with the saved profile. Mobile account rendering at 390×844 had no horizontal overflow. Screenshots include account-security.jpg, account-reset.jpg, account-mobile.jpg and account-offline.jpg under artifacts/m2/after.

Browser work exposed two configuration/state defects before acceptance: Secure-only antiforgery issuance cannot run over local HTTP, and reading a link fragment only at component construction misses a new link on the same Angular route. The local-only antiforgery policy and reactive fragment subscription fix these. The HTTP regression has a database test; same-route link consumption was repeated successfully in the actual browser. Secure authentication cookies remain enabled in Development and production.

## Docker and limitations

Docker Desktop 4.85.0 / CLI 29.6.2 / Compose 5.3.1 are installed. Context desktop-linux targets the Linux-engine named pipe. The Desktop backend log reports startup failure while initializing its inference manager: the dockerInference unix-socket entry under the local Docker run directory cannot be removed/accessed and reports invalid filename/directory/volume syntax. This precedes the M1 timed diagnostic wrapper's policy rejection. No reset, socket deletion, execution-policy workaround or repeated rejected probe was performed. Compose syntax passes; actual container builds/startup and Redis runtime checks remain blocked/unverified locally. CI configuration includes PostgreSQL identity tests, but no remote CI run was launched or claimed.

Production SMTP, HTTPS ingress, certificate provisioning/rotation and deployment remain untested. Automated/browser checks are not a penetration test or full assistive-technology certification. [Identity decisions](../security/m2-identity.md) list remaining operational limits; [future contracts](../architecture/future-platform-contracts.md) distinguish documented requirements from implementation.
