# Contributing

Use Node/npm/.NET pins and a normal clone; no submodule initialization is required. Follow README setup and run `npm run verify` before a commit. For backend changes also inspect formatting with `dotnet format Caelora.Platform.slnx --verify-no-changes`. Keep tests focused on meaningful contracts, failure boundaries and actual behavior.

Use branches such as `feature/platform-foundation-v1` for the requested initial milestone; subsequent agent-created branches normally use `codex/<purpose>`. Conventional commits: `feat(web): ...`, `fix(api): ...`, `docs(security): ...`, `chore(infra): ...`. Keep commits reviewable; do not mix game simulation changes into this repository.

Never commit real credentials or local overrides. `npm run security:scan` checks tracked and untracked nonignored source for recognizable secret patterns and forbidden local files. It is preventive, not a complete secret-detection guarantee. Review staged diffs, dependency advisories and artifact configuration. Do not publish a remote, deploy or enable commerce without the user's authorization and completed release gates.

Account guards are not authorization. Server policies protect all future sensitive routes; no test identity or admin bypass is permitted in production code. Reuse token definitions and small components, but do not create a broad component library before real repeated use. Migrations have one owner in the API; apply them explicitly to disposable/local environments and in gated deployment jobs.

Source assets are outside this repository and remain read-only. Commit only necessary optimized derivatives with provenance/license evidence; confirm rights before deployment. New journal claims need demonstrable facts. Distinguish implemented behavior, intended direction and blocked validation in every engineering report.
