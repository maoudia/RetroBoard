# Proposal

## Why

The landing must explain the product in seconds (a product video), say clearly that the code is open (Fair Source) and how it is funded, and present the new features and pricing.

## What Changes

- "How it works" product video generated in HTML: a scripted, looping animation of the real UI components (no video file), with captions in fr/en, pause control and a reduced-motion fallback (static storyboard).
- Optional MP4/WebM export of the same animation recorded with Playwright for social media.
- Section "Open code, fair business": Fair Source license (FSL, Apache 2.0 after two years), link to the repository, self-hosting allowed, no tracking.
- Pricing section (Free, Pro, Team, packs) from `licensing-and-monetization`.
- Updated feature sections (agenda ring, podium, cursors, E2E, agents, exports).

Out of scope: blog, docs site.

## Capabilities

### New Capabilities

- `landing`: what the landing page must communicate and how the product video behaves.

### Modified Capabilities

None.

## Impact

- Web landing page, `packages/ui` components reused in the video.
