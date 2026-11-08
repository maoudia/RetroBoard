# Tasks

## 1. Tour foundations

- [x] 1.1 Guide manifest (`tests/docs/manifest.ts`: chapters, steps, anchors, caption keys, fr and en) covering the current features (board creation, writing and publishing, voting, agenda and timer, presenter and laser, chat, filter, layout and writing sizes, export, themes, sharing and join); verify a unit test that every anchor exists in `apps/web/app` and every step has both languages
- [x] 1.2 Tour runner over seeded demo boards (fixed clock, invented names, light and dark, fr and en) writing optimised WebP under `apps/web/public/guide/img`; verify the tour runs green twice with identical output names

## 2. Guide generation

- [x] 2.1 Chapter sources in `docs/user-guide/fr` and `docs/user-guide/en` and the static page generator (design tokens CSS, language and variant switch loaded from `'self'`, alt text from captions); verify the pages load under the strict CSP with no console error
- [x] 2.2 Accessibility and size: axe on every guide page, image and total size caps, `pnpm size` unchanged for the entry bundle; verify e2e and `pnpm size`

## 3. Freshness and agent rules

- [ ] 3.1 `pnpm docs:check` (anchors, bilingual text, image references, manifest hash) added to `pnpm verify`; verify unit tests with a renamed anchor and a missing step
- [ ] 3.2 `AGENTS.md` definition of done, `retroboard-stack` skill (and its `.opencode` copy) and the PR template line: regenerate the guide when user-facing behaviour changes; verify `pnpm docs:check` and the openspec validation

## 4. Access from the app

- [ ] 4.1 "User guide" link in the Help dialog and contextual links (language aware, opens the matching chapter); fr and en keys; verify e2e and axe

## 5. Tutorial video

- [ ] 5.1 Recorded tour with highlight overlay (test page only) and WebVTT captions in fr and en generated from the manifest; verify the video plays with captions and that no request leaves the origin
- [ ] 5.2 Optional voice-over script (local engine by default, ElevenLabs as an owner-run option, key from the environment, narration text only) and ffmpeg muxing; verify a dry run without a key still produces the captioned video and never reads board content
- [ ] 5.3 Owner guide in `docs/` (how to regenerate the guide, record the video, add a voice-over, publish the asset); verify the commands run from a clean checkout

## 6. Decision records

- [ ] 6.1 ADR "Generated user documentation and optional voice-over" (including the service terms and cost), roadmap entry and issues sync; verify `pnpm adr:check`
