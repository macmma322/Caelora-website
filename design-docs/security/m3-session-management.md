# M3 browser sessions

M3 extends the existing BrowserSessions table. Each cookie carries its opaque session ID and Identity security stamp. Every authenticated request checks the account, verified email, stamp, server expiry and revocation. If MFA is enabled, the row must also attest successful second-factor authentication. A still-decryptable revoked cookie receives 401 and is cleared; cryptographic validity alone does not grant access.

The session cookie remains `__Host-Caelora.Session`, Secure, HttpOnly, Path=/, SameSite=Lax, with no Domain and no sliding expiry. Default absolute duration is twelve hours, configurable 1–168. M2's HTTP loopback development exception remains browser-specific and must not be used to validate production behavior. Ports do not isolate cookies on the same hostname; use separate hostnames/key namespaces for separate environments.

`GET /api/v1/me/security` returns only the subject's active sessions and twenty latest audit events. Sessions include current marker, creation/expiry/last-seen UTC timestamps and a coarse allowlisted platform/browser description. Raw user agents, precise locations, IP histories and hardware fingerprints are not persisted. Descriptors are untrusted display hints, not proof of a new physical device. Last seen updates conditionally at most once per five minutes and is not an online indicator.

`POST /api/v1/me/sessions/revoke` accepts `scope=selected` plus `sessionId`, `others`, or `everywhere`. It requires recent full authentication, locks the account, scopes database changes to the authenticated UUID, and writes audit/inbox/outbox records in the transaction. Foreign/nonactive selected IDs return 404. Ending the current session clears its cookie. Ending others preserves the current row; requests already executing may finish, but their next authentication check must reject a revoked row. Multiple signed-in browsers are allowed.

Angular exposes the actual server list and actions. Native modal dialogs have an accessible name, Cancel receives initial focus, Escape cancels, and focus returns to the triggering button. Busy states disable repeated submissions; loading/error/success states come from real requests. Mobile session rows wrap; existing reduced-motion CSS remains effective.

Expired/revoked rows remain for the configurable session retention grace (default fourteen days), then bounded cleanup removes them. Live rows are preserved. Old sessions receive a conservative Browser descriptor and LastSeenAt=CreatedAt during migration; historical device information is not invented.

Browser sessions are distinct from a launcher installation key, a user-approved trusted device and an entitlement-bound gameplay lease. None of those three systems is implemented. IP changes do not revoke ownership or create bans. No gameplay concurrency policy runs in M3.

Tests cover remote/current/everywhere revocation, foreign IDs, expiry, cookie replay, startup persistence, key rotation and last-seen write throttling. Local browser UI recorded a second independent Chrome sign-in, a consumed recovery code, and an actual “Ended 1 browser session(s)” response; the HTTPS network probe independently verifies 401 from the terminated cookie.
