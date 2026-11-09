# Design

## Context

RetroBoard is a static Nuxt 4 SPA with strict CSP and a size budget (`pnpm size`), plus a Playwright suite that already drives every flow through stable `data-testid` anchors (`tests/e2e/helpers.ts`: `createBoard`, `join`, `publishNote`). The Help dialog only lists shortcuts. Documentation lives in `docs/` for developers; nothing is written for end users. Hard constraints: no third-party origin at runtime, zero infrastructure cost, fr and en for every string, UI follows `docs/design-system.md`.

## Goals / Non-Goals

**Goals:**
- Screenshots and video come from the real app through a scripted tour, so wording, layout and theme are always the product's own.
- Drift is a failing check, not a review comment.
- The guide is static files served by the same Worker assets, readable offline-friendly and without scripts beyond a tiny language/variant switcher.

**Non-Goals:**
- No in-app interactive product tour or tooltips (a later change).
- No hosted video platform, no analytics on the guide.
- No translation beyond fr and en.

## Decisions

1. **Tour = Playwright script over a manifest.** `tests/docs/manifest.ts` lists chapters and steps: `{ chapter, step, anchor(s), action, caption key }`. `tests/docs/tour.spec.ts` plays it on seeded boards (fixed clock, invented names), takes screenshots per language and variant and writes them under `apps/web/public/guide/img/`. Alternatives: hand-made screenshots (rot immediately), a separate visual tool (a second source of truth). The tour reuses the e2e helpers so a broken flow breaks both.
2. **Guide pages are generated Markdown to static HTML.** Chapter text lives in `docs/user-guide/{fr,en}/*.md` (written by the agent, reviewed by the owner), a small build script renders them with the screenshots into `apps/web/public/guide/<lang>/`. Each page ships its own CSS using the design tokens (no inline style, no script except a ten-line variant switch loaded from `'self'`). Alternative: Nuxt Content (a new dependency and bundle weight) or a Nuxt route (inside the JS budget); static files keep the entry bundle untouched.
3. **Committed or generated images?** Generated at release time and not committed would keep the repo small but makes `docs:check` unable to compare; committing WebP (about 40 to 80 kB each, a few dozen images) is acceptable and reviewable. Decision: commit optimised WebP, one per step, language and variant; check size in the guide check (cap per image, total cap) and measure against `pnpm size`.
4. **Drift check = anchors and freshness, not pixel diff.** `pnpm docs:check` (no browser) verifies that every manifest anchor still exists in the sources (`data-testid` search in `apps/web/app`), every step has text in both languages, every image referenced exists, and the manifest hash stored in the generated pages equals the current one. A browser-based regeneration stays a separate, explicit command (`pnpm docs:guide`). Pixel diffs were rejected: too flaky across fonts and machines.
5. **Agent rules.** `AGENTS.md` definition of done gains "user-facing change: update `tests/docs/manifest.ts`, run `pnpm docs:guide`, commit the result"; same sentence in the `retroboard-stack` skill and its `.opencode` copy. This is the rule suggested in the feedback (agents update the docs when the interface changes).
6. **Video from the same tour.** A second Playwright project records the tour with the built-in video recorder; a highlight overlay (injected by the recorder only, an outline and a soft dim around the target anchor) is added in the test page, not in the product. Captions are generated as WebVTT from the manifest caption keys (fr and en). Encoding with ffmpeg at `-preset veryfast`, H.264 plus WebM fallback if size allows. Remotion and similar motion frameworks were rejected: their license is not permissive for a company use. The video is a release asset served from the product origin (`media-src 'self'` check), not committed if above a size cap (to be decided at apply time; fallback: commit a low-bitrate version).
7. **Voice-over is optional and offline.** A script reads the narration (the captions) and calls a text-to-speech engine chosen by the owner: a local engine (Piper, MIT) as the zero-cost default; ElevenLabs as an owner-run option with `ELEVENLABS_API_KEY` from the environment, never committed, never run in CI. Only narration text is sent. Audio is muxed into the video by ffmpeg. Without audio the video still carries captions. Alternative: runtime TTS in the browser (inconsistent, third-party voices).
8. **Access.** The Help dialog gets a "User guide" link (language aware); pages may link a chapter by anchor (`/guide/en/voting/`). Static assets are served by the Worker assets binding already in use; no relay involvement.

## Risks / Trade-offs

- Screenshot churn in diffs: mitigated by WebP, deterministic seeds and a regeneration only when the manifest hash changes.
- Repo growth: capped per image and in total; the cap is a check.
- Tour flakiness (animations): reuse `settle` and a fixed clock; the tour fails loudly rather than producing a half-rendered picture.
- Voice licensing and consent: the owner picks the voice; the narration is product text only; document the service terms in the ADR. Cloning a real person's voice is out of scope.
- CSP and size budget: verify with `pnpm generate` and `pnpm size`; static folder is outside the Nuxt entry bundle, to be confirmed.
- Maintainer action needed if a dedicated CI job is wanted (workflows are protected).

## Open Questions

None blocking. Assumed: the guide ships with the site under `/guide/`; images are committed WebP; the video lives as a release asset linked from the guide; the owner runs the voice-over step locally.
