# System Prompt: Cove Project AI Developer Agent

This file defines the **Unified Execution Standard** for all Agents (including Codex/Claude Code) working on the Cove repository.

Your primary directive is to **Read `DEVELOPMENT.md` first** and strictly adhere to its rules. Always think first in the aspect of genius who is the most skilled at the work that you are doing before you start to respond or work.

**Target**: Rapid iteration of core features while ensuring regression testing, traceability, and acceptance.

## 1. Core Directives & Golden Rules

1.  **Golden Rule**: ALWAYS read `DEVELOPMENT.md` at the start of a task. It is the default source of truth for architecture, workflow, commands, and detailed execution method.
2.  **Monorepo**: Always set correct CWD. Follow the file structure defined in `DEVELOPMENT.md`.
3.  **Tooling Integrity**: NEVER edit `lock` files or scripted generated code manually. Use the commands defined in the relevant module `DEVELOPMENT.md` (linked from root `DEVELOPMENT.md`).
4.  **Keep AGENTS Concise**: `AGENTS.md` should state key directives, decision gates, and non-negotiables only. Detailed methods, examples, and step-by-step execution guidance belong in `DEVELOPMENT.md` or topic docs.

## 2. Decision Framework (Small vs Large)

On **every instruction**, triage the request and tell the user whether it is **Small** or **Large**.

### A. Small Change (Fast Feedback / 小步快反馈)
- **Scope**: Localized, low-risk, non-structural work.
- **Action**: Proceed directly, run targeted verification, and tell the user what risks you checked.
- If the change touches runtime risk, ownership ambiguity, or cross-boundary behavior, upgrade it to **Large**.

### B. Large Change (Deep Thinking / 慎重对齐)
- **Scope**: New features, refactors, schema/API changes, cross-module logic, or runtime-risk work.
- **Action**: Before coding, you MUST: `Spec -> Approval -> (Feasibility Check if needed) -> Plan -> Approval`.
    - `Spec` must cover business logic, acceptance criteria, top risks, state owners, invariants, and planned verification.
    - `Feasibility Check` is required for new technology, high-performance work, system dependencies, or core refactors.
    - `Plan` must break execution into independently verifiable steps and identify the lowest meaningful regression layer for high-risk work.

## 3. Core Engineering Rules

- **Model First**: Identify mutable state, owner, allowed transitions, and derived UI before changing non-trivial behavior.
- **Prefer Invariants**: Define 1-3 invariants before relying on scenario lists.
- **Escalate Structural Risk Early**: If ownership, authority, or semantics are ambiguous, align before patching.
- **Learn from Prior Art**: When a problem likely has existing industry practice, study external references first and adapt them to Cove before specing.
- **Turn Bugs into Assets**: Real bugs should leave behind stronger tests, rules, assertions, or abstractions.

## 4. Risk & Compliance Checklist

For runtime-risk or Large work, explicitly check:

- Async gaps, concurrency, and lifecycle cleanup.
- State ownership, durable truth, and restart/recovery semantics.
- Main/Preload/Renderer boundaries, IPC validation, and type safety.
- Performance, resource lifecycle, and data integrity.

## 5. Verification & Handoff

- Validate at the lowest meaningful layer first; use UI automation when UI regression risk warrants it.
- Small changes may use targeted verification; final Large changes must pass the full required checks from `DEVELOPMENT.md`.
- Keep detailed methods, examples, and execution playbooks in `DEVELOPMENT.md` and topic docs, not here.

## 6. Development Workflow

1.  **Plan**: Triage (Small/Large) -> Spec (if Large) -> Approval -> Feasibility Check (if needed) -> Plan -> Approval.
2.  **Code (TDD)**
3.  **Verify**:
    -   **Small**: Targeted unit/integration tests OK.
    -   **Final/Large**: **MUST** run full suite (`pnpm pre-commit`).
4.  **Submit**: Review self -> Update PR description -> Handover.
