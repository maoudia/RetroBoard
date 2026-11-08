# The user guide and the tutorial video: how to maintain them

The guide (`/guide/fr/` and `/guide/en/`) and its tutorial video are generated from the real application, so they match what
users see. This page is for the person who changes the product or publishes the video. The design is in
`openspec/changes/user-manual-and-tutorials` and the rule is in `AGENTS.md`: **a change that touches user-facing behaviour
updates the guide in the same pull request.**

## What is where

| What | Where |
|---|---|
| The list of screens (chapters, steps, captions, the test anchors they need) | `tests/docs/manifest.ts` |
| The text of each chapter, per language (a `## <step id>` section per step) | `docs/user-guide/<fr or en>/<chapter>.md` |
| The seeded demo board (invented names and notes) | `tests/docs/demo.ts` |
| The pictures (WebP, light and dark, fr and en) | `apps/web/public/guide/img/` |
| The pages, stylesheet and script (generated, do not edit) | `apps/web/public/guide/` |
| The video (WebM) and its captions (WebVTT) | `apps/web/public/guide/video/<locale>/` |

## Prerequisites (one time)

```bash
pnpm install
brew install webp ffmpeg        # cwebp for the pictures; ffmpeg with libvpx-vp9 for the video (check: ffmpeg -encoders | grep vp9)
pnpm generate                   # the tour runs against `wrangler dev`, which serves the generated site
```

## Regenerate the guide after a UI change

1. Update `tests/docs/manifest.ts` (a new feature gets a chapter or a step and the `data-testid` anchors it needs) and the French
   and English text in `docs/user-guide/`.
2. Run the tour, then the pages:

   ```bash
   pnpm docs:tour      # 12 steps x fr/en x light/dark, about 45 s; writes apps/web/public/guide/img/
   pnpm docs:guide     # the pages from the manifest and the texts
   pnpm docs:check     # part of pnpm verify: stale hashes, missing texts or pictures, anchors the app no longer has
   ```

3. Commit the regenerated pages and pictures with the change. `pnpm docs:check` fails with the name of the step when the
   guide is behind (a renamed `data-testid`, a missing English text, a picture that was not regenerated).

`pnpm docs:tour --grep "en light"` runs one language and variant. The tour fixes the clock and uses invented content: nothing real
appears in a picture.

## Record the tutorial video

```bash
pnpm docs:video     # records the tour in fr and en with a highlight ring on each control, about 2.5 min
```

It writes `apps/web/public/guide/video/<locale>/tutorial.webm` (VP9, 960 px, about 0.8 MB, capped at 3 MB by a test) and
`tutorial.vtt`: one caption per step, from the manifest captions and the recorded timings. Then run `pnpm docs:guide` so the
guide index page shows the player (it appears when `tutorial.vtt` exists) and commit the files. The video is served by the same
Worker (`media-src 'self'` in the CSP), loads only when played and works with captions alone.

If the recording is too long or too heavy, shorten the captions or raise `-crf` in `encodeArgs` (`scripts/docs/video.mjs`).

## Add a voice-over (optional, on your machine)

The voice-over reads the step captions and nothing else; no board content ever reaches a speech engine. It is never run in CI.

```bash
pnpm docs:voice --dry-run                       # prints the narration and the plan, produces and sends nothing
pnpm docs:voice --locale en                     # local engine: macOS `say` (voices Samantha and Thomas), else Piper
pnpm docs:voice --locale fr --voice "Amelie"    # another macOS voice (say -v '?' lists them)
```

- **Piper** (MIT, free): install it, then `PIPER_MODEL=/path/to/voice.onnx pnpm docs:voice --locale en --engine piper`.
- **ElevenLabs** (owner-run, paid service, check its terms and the voice licence): export `ELEVENLABS_API_KEY` and
  `ELEVENLABS_VOICE_ID` in your shell, then `pnpm docs:voice --locale en --engine elevenlabs`. Only the narration text and the
  model name are sent. The key is read from the environment, never written to a file and never committed.

The script lays each clip over the silent video at the start of its step (speeding a clip up to 1.3x at most to fit; it warns
when a caption is still too long) and writes the voiced `tutorial.webm` over the published one. Without a voice-over the video is
unchanged: captions only.

## Publish

The guide and the video ship with the site: merge the pull request and the normal deploy publishes them under `/guide/`. A
separate CI job for the guide is not set up; the checks that run in CI are `pnpm docs:check` (in `pnpm verify`) and the e2e specs
`tests/e2e/guide.spec.ts`, `guide-links.spec.ts` and `guide-video.spec.ts` (CSP, pictures, video, accessibility).
