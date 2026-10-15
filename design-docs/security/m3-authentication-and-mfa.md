# M3 authentication and MFA

Implemented 15 October 2026. This extends M2 ASP.NET Core Identity; it does not introduce a second identity provider. See [verification](../audits/m3-verification.md) for observed results and deployment limits.

## Authentication boundary

Passwords remain framework-hashed, 12–128 characters with four unique characters. Verified email is required. Unknown accounts perform a dummy password hash check; register/resend/forgot responses remain generic. These measures reduce enumeration but do not guarantee indistinguishable network timing. Password and MFA failures use five-attempt account lockout for fifteen minutes. Password checks lock/reload the account row so concurrent failures cannot silently overwrite the count. Network limits remain ten authentication requests and 120 total requests per client IP per minute per process; no queue. They are additional defenses, not sufficient credential-stuffing protection on their own.

Reset and verification tokens use scoped Identity Data Protection providers with a thirty-minute lifetime from generation. Links use fragments, are consumed by POST with Origin/CSRF validation, and are removed from browser history by the existing portal flow. A mail-provider outage returns queued acceptance after the database transaction, not a reason to register again. Password reset revokes browser sessions and emits security records, inbox notification and protected delivery work in its transaction. It does **not** disable MFA or restore lost recovery codes.

## Authenticator lifecycle

1. A recent browser sign-in or `/me/reauthenticate` within five minutes permits enrollment. With MFA enabled, reauthentication requires password and a fresh authenticator code. Recovery-code sign-in is itself full authentication and grants the same short recent-authentication window.
2. `/me/mfa/enrollment` rotates the framework authenticator key, invalidates other sessions, refreshes the current cookie with the new stamp, and returns the secret and provisioning URI once. Pending setup lasts ten minutes. Angular generates a QR locally with the pinned qrcode package; no external QR service receives the secret.
3. `/me/mfa/activate` verifies the first code before enabling MFA, generates ten framework recovery codes, changes the security stamp, and revokes all sessions. The response displays recovery codes once; leaving the page clears its memory. Copying is an explicit user action; there is no local/session storage or automatic download.
4. Password-proven MFA sign-in returns 202 plus an opaque five-minute challenge, not a session or profile. The database stores a hash of its random secret and security stamp. Five challenge attempts and account lockout constrain failures. A successful second factor consumes the challenge before issuing an authenticated session.
5. Regeneration and disablement require recent full authentication, operate under an account row lock, rotate the stamp and revoke every browser session. Old recovery codes stop working after replacement. Disablement clears codes and rotates the old authenticator key. GET status never returns a reusable secret.

Identity owns OTP validation and recovery-code generation/redemption. The application adds serialized, expiring redemption proofs to reject a valid TOTP used for enrollment, sign-in or step-up a second time. Codes are normalized to six ASCII digits. Proofs are SHA-256 of secret plus code, scoped to the immutable user ID, and retained five minutes; this exceeds the framework's accepted clock window. Challenges and recovery redemption serialize on the same PostgreSQL account row. No custom OTP cryptography exists.

`ProtectedIdentityStore` protects Identity token values (authenticator key and recovery-code set) using Data Protection with account/provider/name purposes and a `dp1:` version marker. Database compromise without the keys cannot directly read these values; compromise of the API identity and keys remains critical. Existing M2 had no MFA token values to migrate. Password hashes are not changed by this store.

## Endpoints and screens

All paths below have `/api/v1` prefix. Mutations require exact account Origin plus framework `X-Caelora-CSRF` token/cookie. `/auth/mfa` requires the password-proven challenge; `/me/*` requires a durable authenticated session.

| Operation              | Method/path                 | Portal                            |
| ---------------------- | --------------------------- | --------------------------------- |
| Complete second factor | POST /auth/mfa              | /mfa-challenge                    |
| Recent proof           | POST /me/reauthenticate     | /account/security                 |
| State/count            | GET /me/mfa                 | /account/security                 |
| Begin setup            | POST /me/mfa/enrollment     | /account/security/authenticator   |
| Activate               | POST /me/mfa/activate       | setup, then /recovery-codes       |
| Replace codes          | POST /me/mfa/recovery-codes | security confirmation, then codes |
| Disable                | POST /me/mfa/disable        | security confirmation             |

The actual mapped operations also appear in Development/Testing `/openapi/v1.json`. Check the current Angular routes when linking setup; no secrets belong in route parameters.

## Remaining boundaries

TOTP is phishable. Passkeys, breached-password screening, adaptive abuse defense and a carefully reviewed support recovery process are future work. There is deliberately no support bypass, SMS factor or remember-this-device exemption. A player who loses both authenticator and codes cannot remove MFA merely through email reset. Review recovery policy before opening public registration.

Sessions, challenges, outbox payloads, key files and Mailpit messages are confidential. Do not capture setup/recovery screens or log request bodies, cookies, OTPs, email fragments or arbitrary SMTP exceptions. Tests use synthetic accounts and maintained OTP libraries only.
