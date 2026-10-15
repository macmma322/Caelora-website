# ADR-001: One platform monorepo, independent deployments

Status: Accepted. Date: 2026-10-15. Scope: website ecosystem only.

## Decision

Use a conventional Git monorepo at `D:\Caelora-website`. Astro, two Angular applications and the ASP.NET API have explicit directories and independent build outputs. Node packages use npm workspaces and one lockfile. .NET has its own solution and NuGet lockfiles. No submodules or nested repositories are created. The Unity repository remains entirely separate at `D:\Caelora`.

## Evidence and alternatives

Zone-32-19 is a superproject with nine declared submodules. USSX-Stemini-dev declares thirteen, including separate authentication and account applications. Those boundaries provide independent repository permissions and histories, but their root CI cannot by itself validate all child changes. The root Zone workflow inspected only installs root dependencies and inspects submodule pointers. Contributors must coordinate child commits, pointer updates and recursive clones.

J.A.R.V.I.S demonstrates that one npm workspace can hold independently named applications, configuration, contracts and implementation packages, with one verification entry point. Malrynth uses a conventional Cargo workspace even though its members target different execution environments. Different runtimes do not require different Git repositories.

For one platform team and one first milestone, permission isolation is not a demonstrated need. Atomic changes across the API, contracts and portals are more valuable than independent repository histories. No inspected reference provides a compelling reason to adopt submodule operations here.

| Concern                   | Monorepo decision                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend/backend releases | Separate artifacts; changes do not imply simultaneous deployments. Use path filters when CI cost warrants them.                        |
| Launcher                  | Future `clients/launcher`, separately versioned native build. Split repository later if ownership/permissions demand it.               |
| Contracts                 | Versioned OpenAPI + small TypeScript package; expand compatibility tests before generation. No C# domain assemblies shared with Unity. |
| Permissions               | Git access covers the whole platform source; production permissions come from deployment identities, not folders.                      |
| Dependencies              | One npm lock; .NET project locks. No requirement that npm build C#.                                                                    |
| Onboarding                | Normal clone, `npm ci`, bootstrap, solution restore; no recursive clone or missing child SHA risk.                                     |
| CI                        | One cross-stack verification workflow, separate build outputs.                                                                         |

## Costs and reconsideration

Repository access cannot isolate contributors by folder. Root dependency updates can affect multiple apps and require all builds. Shared packages must remain small and must not erase deployable boundaries. Reconsider a split when separate teams need repository-level permissions or the native launcher has materially independent ownership. Do not pre-empt those requirements with submodules. Never add the Unity game as a website submodule by convenience.

Remote repositories, public publishing and deployment are outside this authorization. No website remote is configured. The existing `macmma322/Caelora` remote belongs to the game.
