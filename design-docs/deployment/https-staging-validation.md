# HTTPS validation and staging gates

Local evidence is not a production approval. On 15 October 2026, the existing Windows localhost development certificate was explicitly trusted by the user through the OS prompt. `dotnet dev-certs https --check --trust` succeeded. No browser warning or TLS validation was bypassed. The private PEM export remains in ignored local state.

## Reproduce locally

From `D:\Caelora-website`, preserve the native PostgreSQL/Mailpit state and existing generated configuration. Build before starting the Release API; Windows can lock its executable during a rebuild.

```powershell
npm run infra:native
npm run build
npm run build:api
pwsh -NoProfile -File scripts/setup-local-https.ps1
# First-time trust only: rerun with -Trust and approve the Windows certificate prompt.
```

Run in separate terminals:

```powershell
pwsh -NoProfile -File scripts/dev-api-https.ps1
node scripts/serve-local-https.mjs --app account --port 4443
```

Open `https://localhost:4443`. The static helper serves the real account production build, strict CSP/security headers, SPA routes and safe public runtime JSON targeting API 7443. It binds loopback only and is a development helper, not a production ingress. Optional `--app web --port 4444` serves the built public site; rebuild Astro with the intended public origins for coherent navigation/canonicals. M3 runtime browser verification focused on the account portal.

```powershell
node scripts/verify-local-https.mjs
```

This real-network probe creates only generated `@caelora.test` accounts and uses Mailpit. Node trusts the exported exact development certificate while retaining hostname/certificate verification. Credentials, cookies, OTPs and action URLs stay in memory and are never printed. The probe checks verification/reset frontend routes and real backend mutations, cookie attributes, exact-origin credentialed CORS, missing-CSRF/wrong-Origin rejection, TOTP activation, two independent cookie jars, revoked-cookie rejection, persisted inbox/read state and logout. It may wait for the unchanged real ten-per-minute authentication limiter. It does not replace actual browser SameSite behavior.

## Observed browser behavior

Actual IAB and independent Chrome sessions used trusted HTTPS without an interstitial. The portal completed password→TOTP challenge→authenticated profile. Recovery-code sign-in created a separate session; the security action reported one remote session ended. Notifications persisted and “mark all read” changed five unread to zero. Existing cookie remained valid after a Release API restart with the same keyring/database.

Desktop 1440×900 and mobile 390×844 layouts were inspected. Mobile had no document horizontal overflow. Dialog Cancel focus, Escape and trigger focus restoration were verified. The strict policy initially exposed Angular critical-CSS inline loading; production builds now disable critical-CSS inlining instead of weakening script/style policy. QR images use locally generated data URLs, permitted explicitly by image CSP in local and promotion headers. Secrets/recovery-code screens were not captured.

## Forwarding and replicas

Nonlocal API traffic requires HTTPS (health endpoints excepted); HSTS is enabled outside Development/Testing. `Transport:TrustedProxies` accepts up to eight exact IP addresses; forwarding middleware is completely disabled for an empty list. Only one symmetric X-Forwarded-For/Proto hop is honored. Tests verify ignored spoofing and the configured hop. Deploy behind a known ingress that overwrites external forwarded headers, prevents direct API exposure, and filters Host; do not use a wildcard trust list.

Single API instance is the supported default abuse-defense topology. For multiple replicas, startup requires `Delivery:ReplicaCount>1` plus explicit `ExternalThrottleConfigured=true`. This is an operator acknowledgement, not an installed distributed limiter. Use a reviewed shared edge/WAF policy for the authentication and total limits, prevent direct bypass, and runtime-test failover and consistency before setting it. Local Redis is not made mandatory to unblock development; existing nonlocal infrastructure validation remains intact.

## Still requires staging

Real non-loopback hostnames and domain-separated cookies; Safari/Firefox and cross-site navigation/SameSite checks; actual ingress certificate renewal/HSTS/Host policy; forwarded-header behavior through that ingress; shared encrypted keyring mounted on two hosts; external throttling under load/failover; real authenticated SMTP TLS/DNS/SPF/DKIM/DMARC and mailbox accessibility; deployment secret ACLs and backup recovery on a separate machine. None was publicly deployed or verified by localhost testing. Docker/Redis container runtime remains blocked separately.
