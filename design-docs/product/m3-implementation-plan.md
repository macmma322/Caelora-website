# M3 implementation plan — 15 October 2026

Starting HEAD: 08dde742a46882ea8b7d8760a69e81e3a0300f71 on feature/m2-integration; clean. Branch: feature/m3-security-and-reliability. No Unity changes, public deployment or remote push.

## Audit and baseline

M2 reports, security decisions, configuration and future contracts reviewed. IdentityFoundation follows InitialPlatform; users, BrowserSessions and SecurityEvents are real PostgreSQL records. Account routes use exact-origin credentialed CORS and framework antiforgery. Login validates durable cookies on each request; reset revokes sessions. Keys persist with Windows DPAPI locally and certificate encryption outside local environments. Native PostgreSQL 55432, SMTP 1025/Mailpit 8025, website 4321, account 4200, admin 4300 and API 5080 already run; preserve their data/configuration.

Baseline npm run verify with real PostgreSQL: 16 Node and 45 .NET tests passed, zero skipped/failed. Log: ignored artifacts/m3/baseline.log. Existing direct SMTP occurs after account state is saved and can return 503 after registration. No transactional mail queue, MFA, remote revocation, last-seen descriptors, notification inbox or cleanup exists. Throttling is process-local; HTTPS/proxy/key recovery was not runtime verified. Docker backend log remains at its inference-manager startup error; no reset, deletion or rejected probe is repeated.

## Checkpoints

1. PostgreSQL transactional outbox + notification records, encrypted payloads, branded multipart mail, leased SKIP LOCKED claims, bounded retry/dead-letter/expiry and explicit operator retry. Refactor existing workflows without losing baseline coverage; migrate disposable tests before developer DB.
2. Framework Identity TOTP enrollment/challenge/recovery, encrypted framework token storage, short password-proven challenges, serialized one-use proofs, recent reauthentication, security-stamp/session invalidation and actual Angular screens.
3. Extend BrowserSessions with coarse allowlisted descriptors and throttled last seen. Subject-scoped revocation/all-others/everywhere; persisted paginated notifications, unread/read API and UI. No hardware trust or gameplay leases.
4. Typed operational settings, bounded retention, worker/key/database failure checks, trusted-proxy/replica deployment guards, local HTTPS setup and actual desktop/mobile journeys. Never bypass browser certificate warnings.
5. Run full verification with PostgreSQL, Mailpit and real browser flows. Commit coherent checkpoints and record implemented/verified/blocked/documented/not-started honestly.

## Security boundaries

Framework owns OTP validation, password hashing and recovery codes. Encrypt provisioning/recovery secrets at rest; never log payloads or proofs. Outbox is at-least-once: SMTP acceptance plus a crash can duplicate a delivery. Leases must outlast bounded SMTP processing and ownership checks prevent stale finalization. Atomic database state/outbox creation is mandatory. No speculative commerce/provider tables. Native HTTP remains a development path; production requires explicit HTTPS origins, keys/certificates and operational topology. Preserve existing developer rows; cleanup only expired records under explicit bounded policy.
