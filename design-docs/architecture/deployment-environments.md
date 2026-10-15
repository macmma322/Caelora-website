# Deployment environments

| Environment | Website/portals                                                                   | API and data                                                                    | Release posture                                            |
| ----------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Development | Loopback Astro/Angular dev servers; ignored public config                         | Optional loopback Compose; dependency checks explicitly show disabled state     | No Docker requirement for frontend or basic API tests      |
| Testing/CI  | Synthetic public origins and generated runtime JSON; no production artifact claim | In-memory test host, negative dependency tests; PostgreSQL/Redis CI service job | No third-party credentials or publishing                   |
| Staging     | Separate HTTPS origins; robots disallow indexing                                  | Separate DB, Redis, keys, storage prefix and integrations in test/sandbox mode  | Promote same Angular JS; approve actual environment config |
| Production  | Static Astro CDN; separate account/admin origins                                  | Non-root API behind TLS ingress, managed PostgreSQL/Redis, durable secrets      | Gated deployment; none is created by this milestone        |

## Cloudflare-compatible topology

Serve `apps/web/dist` as static assets. `_headers` contains static security headers. There is no server adapter or requirement to run Astro in production. Build with the real PUBLIC_SITE_URL and production environment; sitemap and social metadata are build-time output. Configure a genuine 404 response to use 404.html.

Account/admin are separate Angular builds under dist/account/browser and dist/admin/browser. Use SPA route fallback for application paths, but serve runtime-config.json explicitly as JSON/no-store and never fallback that path. Generate headers with the runtime-config deployment script so CSP connect-src permits only the configured API origin. CI test config must never be promoted unchanged. Put admin behind an additional identity-aware ingress before deploying future administrative functionality; this does not replace server policy authorization.

The ASP.NET container runs on port 8080 as the built-in non-root APP_UID. Local Compose uses Development explicitly and is not a production deployment stack. In production, ingress terminates TLS, filters hosts, restricts health endpoints and forwards only known proxy metadata. Current application does not trust arbitrary forwarded headers; add a configured KnownProxies/KnownNetworks policy before deriving identity/rate limits from forwarded addresses. With no such policy, rate limiting sees the proxy and remains conservative.

Do not expose PostgreSQL or Redis publicly. Use separate migration credentials for release jobs; application credentials should lack DDL permission after applying migrations. Run migrations as a gated job before promoting traffic. Never silently migrate on each API startup. Readiness fails for unreachable configured dependencies or pending migrations; liveness does not depend on them. Restrict health endpoints at ingress because readiness exercises dependencies.

## Release gates

Verify CI, dependency audit and secret scan; confirm artwork rights and publisher/legal/support information; configure real HTTPS hosts and AllowedHosts; inject credentials from a secret store; review retention/backup/restore and observability; verify negative startup and real dependency readiness; verify route fallback and CSP; document rollback and database compatibility. No public deployment, domain purchase, remote creation or Stripe/Steam activation has been performed.

Future observability uses structured console logs, trace IDs, request duration/error metrics and health checks shipped to the chosen provider. Do not log passwords, raw tickets, signing keys, cookies or full payment payloads. A retention and redaction policy must exist before user activity is collected. Object storage is a future managed S3-compatible service with private buckets and signed access, not a frontend credential.
