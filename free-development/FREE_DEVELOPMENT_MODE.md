# Free Development Mode

Free Development Mode is an optional mode for after the structured lesson is complete.
It lets the learner choose any product idea and continue development while still following the workflow taught by this repository.

This mode does not replace STEP7 or STEP14.
It starts only when the learner explicitly chooses it.

## Required Workflow

Use the same workflow learned in the lesson:

1. Confirm the product repository boundary.
2. Choose the product stack with the learner.
3. Define the product with `docs/product/REQUIREMENTS.md`.
4. Convert requirements into `docs/product/SPECIFICATION.md`.
5. Plan the work in `docs/product/IMPLEMENTATION_PLAN.md`.
6. Track work in `docs/workflow/TASK_TRACKER.md`.
7. Preserve restart context in `docs/workflow/HANDOFF.md`.
8. Declare entrypoint, source, and test authorities in `ops/PRODUCT_MANIFEST.tsv`.
9. Keep product-local `skills/` and `tools/` so routine maintenance can run from inside the product repository.
10. Follow the Dashboard Settings product workflow Git usage mode.
11. Work on a branch and commit small, reviewable changes when Git is applicable.
12. Run local tests and product safety checks.
13. Push, remote-sync, and confirm CI only when the selected product mode and Git workflow action settings make those phases applicable.
14. Update documentation before considering the work complete.
15. Resolve `docs/workflow/INSTRUCTION_MEMORY.md` through the shared parent
    policy below the product-local `AGENTS.MD` invariants. A valid
    product-local file has procedural priority; exact absence alone may use the
    parent fallback for an explicitly selected parent-managed repository.

## Technology Choice Support

The learner may freely choose the technologies needed for the product, including:

- Programming languages
- Frontend frameworks
- Backend frameworks
- Databases
- Authentication
- Payment systems
- Hosting and deployment tools
- Testing tools
- External APIs and integrations
- Team development and Docker/container tools

The repository should help introduce, compare, and adopt those choices.
Do not force a default stack when the learner has chosen another one.
When a technology choice has operational risk, cost, credentials, security, or vendor lock-in implications, explain the tradeoff before implementation.

Record chosen technology decisions in the product repository, preferably in `docs/product/SPECIFICATION.md`, `docs/product/IMPLEMENTATION_PLAN.md`, `docs/workflow/TASK_TRACKER.md`, or a dedicated architecture note if the project needs one.

## Product Setup Prompt

```text
I want to use Free Development Mode.
Please help me choose or confirm the product repository, then guide development using the workflow from this lesson repository.
Start with a dialogue about my goal, users, constraints, priorities, and success criteria.
Ask one question at a time when choices are unclear.
Help me choose the programming language, framework, database, payment system, and other tools needed for the product instead of assuming a fixed stack.
Do not skip requirements, specification, implementation plan, task tracking, handoff, local checks, or product safety checks.
Use Dashboard Settings as the source of truth for whether Git, remote sync, and CI apply to this product.
Use the standard product repository scaffold: docs/product/, docs/workflow/, docs/memory/, ops/, skills/, tools/, src/, and tests/.
Keep product-local skills and tools minimal, product-scoped, and reusable so the product can run document, structure, security, and test checks from inside its own repository.
Declare the actual entrypoint, source, and test authorities in ops/PRODUCT_MANIFEST.tsv so the dashboard and gates can read them without guessing the stack.
Follow the resolved instruction-memory procedure. When the parent fallback is
active, normal transitions inside the current requested task scope do not need
separate approval; destructive operations, credentials, external authority,
unowned changes, failed-CI merge, or scope expansion still stop.
```

## Completion Gate

Free Development Mode work is ready only when these checks pass:

```bash
./tools/free-development gate
```

`./tools/free-development gate` reads the product workflow Git usage mode from Dashboard Settings:

The gate also resolves instruction memory read-only. It never generates or
copies `INSTRUCTION_MEMORY.md` into the selected product repository. A present
but invalid local file is a blocker and is not treated as missing. The resolved
instruction source cannot override product-local `AGENTS.MD` invariants.

The additive Next Workflow runtime follows the same boundary. A child-local
procedure may specialize product development but cannot widen parent-managed
Git/GitHub, provider, external-send, filesystem, network, runtime, or cost
authority. Those capabilities remain intersections with current parent
settings; safety and rigor remain maximum floors; required verification and
documentation duties are additive. Missing, stale, ambiguous, expired, or
revoked parent authority blocks the affected action. Each repository retains
its own bounded state store and evidence; no parent/child shared database or
ordinary parent-CI child traversal is permitted. The existing Free Development
procedure remains authoritative unless this exact repository is admitted
through the externally installed parent launcher with immutable-candidate,
signed-release, recovery, and activation-transition proofs. The paused Control
Center is presentation only and cannot substitute for or block that authority.

When the parent protected runtime is used for an isolated verification or
activated headless task,
the child receives only the resolved local-first instruction envelope and
bounded read-only inputs. It does not receive the parent database, owner trust,
credentials, Git authority, or a writable child checkout. Missing Bubblewrap
or namespace support stops with copyable installation and recheck guidance;
there is no lightweight-but-unisolated fallback.
Likewise, a provider descriptor created by the parent test suite is isolated
test data only. A product or Free Development run cannot inherit, copy, or use
that fixture as provider certification or Production launch authority.
Bubblewrap and unshare cannot be fixture-substituted at all. If either real
fixed-path prerequisite is absent, positive parent bootstrap is unavailable
and only the non-installing diagnosis/guidance path may pass.
Reuse of the non-executed provider descriptor by parent launcher-integrity
tests does not make it available to a product or Free Development run.

- `none`: product workspace, canonical documents, scaffold authority, product security, and required local checks are still required; Git, remote sync, and CI are not applicable.
- `local`: local Git worktree and local Git safety checks are required; remote sync and CI are not applicable.
- `remote_sync`: local Git and remote sync are required; CI is not applicable.
- `ci`: local Git, remote sync, and CI are required. This is the default and preserves the strict existing behavior.

For team development or container work, use `advanced/TEAM_DEVELOPMENT_DOCKER.md`.
