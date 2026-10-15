# Repository structure and ownership

```text
Caelora-website/
  apps/
    web/                  Astro static site; public assets and editorial pages
    account/              Angular public account shell and informational routes
    admin/                Separate Angular build; unavailable access presentation
    portal.css            Small shared operational shell style
  services/platform-api/
    Application/          Public capability use case
    Configuration/        Typed options and startup validator
    Contracts/            Versioned HTTP response DTO
    Infrastructure/       EF context, explicit migration, dependency readiness
    Program.cs            Composition root and HTTP boundary
  packages/
    design-tokens/        Framework-independent CSS tokens and base states
    api-client/           Public TypeScript contract/client, runtime config loader
    shared-assets/        Provenance, hashes and third-party licenses
  infrastructure/docker/  Local PostgreSQL/Redis and API container build
  design-docs/            Architecture, decisions, security, product, deployment, audits
  scripts/                Safe local bootstrap, verification, asset optimization
  tests/                  Node configuration tests and ASP.NET integration tests
  .github/workflows/      Verification, no deployment or publishing
  Caelora.Platform.slnx
  angular.json
  package.json
```

There is one `.git` at the root. `clients/launcher`, deployment stacks and observability stacks are deferred until they contain real code. Launcher requirements and manifests are documented without an empty native project.

Do not import account/admin components into Astro. Tokens have no framework dependencies. The API client may depend on transport contracts, never backend domain models. Angular bootstrap helpers in api-client are explicitly imported only by Angular apps; its core transport/config modules do not import Angular. If more helpers are needed, move them to an Angular-only package rather than growing a general utility bucket.

Every app can deploy independently. Root builds intentionally verify all first-milestone outputs. A shared package change requires consumers' builds. Generated artifacts, local runtime configuration and real .env files are ignored. Optimized public artwork and licenses are committed so a normal build does not require the original workstation asset paths.
