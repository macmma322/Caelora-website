# M2 account implementation

## Authority and persistence

ASP.NET Core Identity owns credential hashing, password validation, email normalization, lockout, security stamps and protected action tokens. PlatformUser.Id is an immutable UUID; the framework username is its UUID string. Email and display name are mutable attributes, never ownership keys. PostgreSQL's unique normalized-email index handles concurrent registration; EF's concurrency stamp protects updates. Identity's external-login table is framework infrastructure, not an implemented Steam integration.

Migration `20261015084239_IdentityFoundation` follows the M1 baseline without dropping existing tables. It creates Identity tables plus BrowserSessions and SecurityEvents in the platform schema. UTC timestamptz values are used. BrowserSessions has an account FK, creation/absolute expiry/revocation timestamps and an index for account lookup; events have nullable account FK, bounded event kind and UTC occurrence time. No IP, location, fingerprint or user-agent is stored. User deletion cascades browser sessions and clears event account references. No public delete-account endpoint exists.

## Browser boundary

Session authentication uses a host-only `__Host-Caelora.Session` cookie: Secure, HttpOnly, SameSite=Lax, Path=/, no Domain, absolute expiry (12 hours by default), no sliding refresh. Each authenticated request checks the durable session, expiry/revocation, verified email and security stamp. New logins on distinct browsers can coexist. Re-login replaces the current browser's previous session. Logout revokes its server record, so a replayed cookie fails. Reset changes the password/security stamp and revokes every browser session in a transaction. Durable Data Protection keys permit host restarts.

Every state-changing account endpoint requires the exact configured Origin and a framework antiforgery cookie/header pair (`X-Caelora-CSRF`), including anonymous registration/login/reset. Credentialed CORS permits only that origin, GET/POST/PUT and the required headers. Angular guards improve navigation; API authorization remains authoritative. Unauthorized API requests return 401, never an HTML login redirect. Responses are no-store. Forms keep credentials and action tokens in memory; no localStorage/sessionStorage bearer token exists. Recovery links use fragments, which the client consumes and clears without passing them to web-server paths or referrers. Confirmation requires a deliberate POST, not an email-prefetch GET.

Development HTTP on loopback uses a separately named HttpOnly, SameSite=Strict antiforgery cookie with SameAsRequest transport; Testing/production use a Secure `__Host-` antiforgery cookie. The authentication cookie stays Secure in every environment. Chromium's localhost behavior was exercised successfully. Production requires HTTPS and exact non-loopback origins. Local browser/API hostname must match (`localhost` throughout).

## Recovery, mail and abuse controls

Email confirmation and password reset use Identity Data Protection tokens scoped to user, purpose and security stamp, with 30-minute validity. Confirmation rejects an already-confirmed user and rotates the stamp; reset rotates the stamp through Identity. Successful reset/confirmation cannot replay. Tests cover expiry and replay. Passwords are 12–128 characters, with at least four distinct characters; PBKDF2 is supplied by Identity, not custom code. Five incorrect passwords lock an account for 15 minutes. Sensitive routes have an additional ten requests per source IP per minute over the global 120/minute limiter. The request body limit is 16 KiB.

Registration (including duplicates), resend and reset requests use generic accepted responses. Invalid/unverified/missing-account credentials receive a shared rejection. Dummy framework hash verification reduces obvious login/duplicate-registration timing differences. This is not constant-time enumeration resistance: SMTP latency and synchronous delivery can still differ. Delivery failures return 503 and record IdentityEmailDeliveryFailed; users can retry resend. No application success-only mail provider exists. The test-only CaptureMail replaces SMTP only inside integration tests. Real browser flows used actual SMTP to Mailpit. Production adapter uses MailKit, authenticated STARTTLS and injected configuration.

Security events cover registration, verification, accepted/rejected/locked login, sign-out, profile changes, password reset and delivery failure. Security overview exposes only the authenticated account's active browser sessions and latest 20 events. Individual remote revocation, trusted-device controls, MFA, email changes and password changes while signed in are absent and explicitly labeled. Forgotten-password recovery is implemented.

## Operational limits before public release

Production key storage must be an explicit persistent directory encrypted with an injected PFX certificate; Development on Windows uses DPAPI. Testing/Linux local keys are filesystem-persisted and require restricted directory permissions. Production SMTP delivery, certificate provisioning, key rotation/restore and public ingress have not been exercised here. Keep private configuration and key files out of build contexts and artifacts.

Before publication: provide reviewed privacy/contact policies and retention/cleanup, queue/outbox delivery with retries, operational alerts, breached-password screening and MFA/step-up design; exercise concurrent recovery and provider outages. Rate limits are process-local, with the actual socket address as key. A future ingress must configure trusted forwarded headers and distributed throttling; never trust arbitrary forwarded IPs. Session validation performs a database read per authenticated request, an intentional correctness tradeoff at this scale. Email delivery failure and uniqueness races do not create duplicate accounts; SMTP delivery is not transactionally atomic with account creation.

The account portal reuses the compact production Caelora wordmark derivative. Source/trim provenance is recorded by M2A's brand manifest and asset README; no new branding was generated.
