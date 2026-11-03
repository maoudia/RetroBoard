# Proposal

## Why

RetroBoard has grown to many features (agenda, voting, presenter mode with laser, chat, exports, layout, themes) and the only help is a keyboard-shortcuts dialog and the README. New facilitators cannot discover what the product does. Community feedback (2026-11-03) points at a cheap, proven lever: let the coding agent write the user manual, with real screenshots that follow the design system, and let agents keep it current. Documentation that is generated from the running app cannot drift silently and costs no infrastructure.

## What Changes

- An illustrated **user guide** in French and English, generated from the real app: each step carries a screenshot taken by a scripted tour on a seeded demo board, with the product's own design tokens, in light and dark.
- A **guide manifest** that lists every user-facing feature screen (with the stable `data-testid` anchors the tour needs) so a missing or broken screen fails a check instead of rotting.
- A **drift check** (`pnpm docs:check`, part of `pnpm verify`) and agent rules in `AGENTS.md` and the `retroboard-stack` skill: a change that touches user-facing UI regenerates the guide in the same PR (the agent rule suggested in the feedback: update the docs automatically when the interface or features change in a major way).
- Access from the app: the Help dialog and contextual "?" links open the guide in the current language.
- A **tutorial video** produced from the same tour: recorded walkthrough with highlight overlays, WebVTT captions in fr and en, and an optional voice-over generated offline by the owner (local text-to-speech by default, ElevenLabs as an owner-run option). Nothing third-party is loaded at runtime.
- An ADR for "generated documentation and optional voice-over" and a roadmap entry.

## Capabilities

### New Capabilities
- `user-documentation`: the illustrated bilingual user guide, its freshness guarantees, its access from the app, and the tutorial video with captions.

### Modified Capabilities
<!-- none: the Help dialog gains a link, which the new capability owns -->

## Impact

- New: `docs/user-guide/` sources (Markdown, fr and en), `tests/docs/` tour and manifest, a generation script, static output under `apps/web/public/guide/`.
- Changed: `apps/web` Help dialog (link), `AGENTS.md` (definition of done), `.claude/skills/retroboard-stack/SKILL.md` and its OpenCode copy, `package.json` scripts, `docs/roadmap.md`, one ADR.
- No relay, protocol, domain or storage change. No new runtime dependency; build-time tools (Playwright already present, ffmpeg in the workspace) only. Static assets stay outside the JavaScript size budget (to be confirmed by `pnpm size`).
- `.github/workflows/**` is not touched: a dedicated CI job for the guide needs an explicit maintainer request.
