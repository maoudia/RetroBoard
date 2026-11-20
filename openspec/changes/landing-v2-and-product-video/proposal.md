# Proposal

## Why

The landing must explain the product in seconds (a product video), say clearly that the code is built in public and source available under the PolyForm Noncommercial License 1.0.0 (ADR-0040), and present the new features.

## What Changes

- "How it works" product video generated in HTML: a scripted, looping animation of the real UI components (no video file), with captions in fr/en, pause control and a reduced-motion fallback (static storyboard).
- Optional MP4/WebM export of the same animation recorded with Playwright for social media.
- Section "Built in public, source available": PolyForm Noncommercial License 1.0.0, link to the repository and the LICENSE file, self-hosting allowed for noncommercial use, commercial rights reserved to the author, no tracking.
- Updated feature sections (agenda ring, podium, cursors, E2E, agents, exports).

Out of scope: blog, docs site.

## Capabilities

### New Capabilities

- `landing`: what the landing page must communicate and how the product video behaves.

### Modified Capabilities

None.

## Impact

- Web landing page, `packages/ui` components reused in the video.
