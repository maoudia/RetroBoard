---
status: accepted
date: 2026-11-08
decision-makers: Moncef Aoudia
---

# Generated user documentation and optional voice-over

## Context and Problem Statement

RetroBoard has grown to many features (agenda, voting, presenter mode with laser, chat, report, themes) and the only help was a keyboard-shortcuts dialog and the README. New facilitators could not discover what the product does, and hand-written documentation with hand-taken screenshots goes stale at the first redesign. How do we ship a guide and a tutorial video that match the product, stay current as it evolves, and respect the project constraints (strict CSP, no third-party origins, no paid service, French and English)? Implements the OpenSpec change `user-manual-and-tutorials`.

## Decision Drivers

* The guide must not silently go stale: a change to a screen must fail a check, not rot.
* Strict CSP and no third-party origin (ADR-0004, openspec/config.yaml): no embedded video platform, no external docs host, no remote fonts.
* ADR-0018 (no paid service, no vendor lock-in): anything that costs money or needs an account must be optional and owner-run.
* French and English with the same rigour as the product (i18n rule).
* Demo content only: never real board content or personal data in a picture.

## Considered Options

* A hand-written guide with screenshots taken by hand, in Markdown.
* An external documentation site or video platform (for example a docs SaaS, YouTube).
* A guide generated from the real application: a manifest of screens, a scripted tour on a seeded demo board that photographs each step, static pages built from the manifest and Markdown texts, a drift check in the standard verification.

## Decision Outcome

Chosen option: "A guide generated from the real application", because it is the only one that can fail a build when a screen changes and that stays inside the constraints.

* **Manifest and tour.** `tests/docs/manifest.ts` lists every user-facing screen (chapters, steps, test anchors, captions in French and English) as plain data. `pnpm docs:tour` runs it on a seeded demo board (invented names and notes, fixed clock) with Playwright, in both languages and both variants, and writes optimised WebP pictures. It has its own Playwright configuration: it never runs with the e2e suite.
* **Static pages.** `pnpm docs:guide` builds the pages under `apps/web/public/guide/` from the manifest and `docs/user-guide/<fr|en>/*.md`: no inline script or style, a stylesheet from the Studio theme's tokens, a script that only remembers light or dark. The Worker serves `/guide/` as ordinary static assets. Pictures are committed, each under 150 KB and 3 MB in total (tested).
* **Freshness.** `pnpm docs:check`, part of `pnpm verify`, fails with the guide step's name when a hash is stale, a text or a picture is missing in a language or variant, or an anchor no longer exists in the app. The agent rules (AGENTS.md, the stack skill, the PR template) require the manifest, the texts and the regenerated pages in the same pull request as a user-facing change.
* **Video.** A tutorial video is recorded from the same tour with highlight overlays on the test page only, and WebVTT captions generated from the manifest captions, self-hosted next to the guide (`media-src 'self'`).
* **Voice-over is optional and owner-run.** The narration text is the manifest captions, never board content. The default engine is local (the operating system's speech synthesis); ElevenLabs is an option the owner runs by hand with their own key from the environment. Neither runs in CI, no key is ever committed, and the captioned video without any voice is complete.
* **Service terms and cost.** ElevenLabs is a paid service with plan limits and its own terms on commercial use and attribution; the owner checks them before using it and accepts the cost. Nothing in the product, the build or CI depends on it (ADR-0018).

### Consequences

* Good, because a renamed control or a new feature fails `pnpm verify` until the guide says the right thing.
* Good, because the guide, its pictures and the video are self-hosted, accessible (axe on every page, text alternatives from the captions) and work offline-first like the rest.
* Good, because the same manifest feeds the pictures, the pages, the captions and the drift check: one source of truth.
* Bad, because the pictures are committed (about 1.8 MB per regeneration), so the repository grows with each guide update; the size caps and the fact that only changed screens need regenerating keep it bounded.
* Bad, because the tour needs a Playwright run and `cwebp` or an ffmpeg with `libwebp` on the machine that regenerates the guide (documented in the owner guide).
* Bad, because a user-facing change now carries a documentation step; this is the intended cost.

## More Information

* OpenSpec change `user-manual-and-tutorials` (archived with this decision), `docs/user-guide/`, `tests/docs/`, `scripts/docs/`.
* ADR-0004 (keys in the link, strict CSP), ADR-0018 (no paid service, no vendor lock-in), ADR-0022 (WCAG 2.2 AA).
* Revisit when the guide has more than about 20 chapters (picture budget) or when the product gets a third language.
