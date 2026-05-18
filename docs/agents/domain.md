# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This repo is **single-context**: one `CONTEXT.md` + `docs/adr/` at the repo root covering the whole system (Django backend + React/Vite frontend).

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — the project glossary and domain language.
- **`docs/adr/`** at the repo root — architectural decisions touching the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The producer skill (`/grill-with-docs`) creates them lazily when terms or decisions actually get resolved.

## File structure (this repo)

```
/
├── AGENTS.md
├── CONTEXT.md                          ← project glossary (lazy)
├── docs/
│   ├── adr/                            ← architectural decisions (lazy)
│   └── agents/                         ← skill configuration (this file lives here)
├── certificates/ templates/ students/ users/ analytics/ core/ cert/   ← backend
└── src/                                                                ← frontend
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
