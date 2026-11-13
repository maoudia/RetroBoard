# Proposal

## Why

The public launch (R2) is gated on a landing page that Lighthouse rates above 95 on mobile. The landing measured 90 for performance and 95 for accessibility: the first and the largest contentful paint waited for the entry bundle, because every route was a client-rendered shell.

This was group 3 of `landing-v2-and-product-video`. It is split out as its own change so that the speed work can finish and be archived while the product video and the content sections stay open.

## What Changes

- Hybrid rendering (ADR-0038): `/` is prerendered at build time, every other route stays a client shell. The hero and the sections are in the HTML.
- No inline style attribute in the prerendered markup (strict CSP), no store snapshot in the payload, the visitor's language applied after hydration. The build fails on an inline style.
- Accessibility 100: a target for the skip link, full contrast of the animated hero mock at every frame.
- Per-page Lighthouse minimums in `quality/lighthouse-budgets.json`: the landing at performance 0.95 and accessibility 1.

## Capabilities

### New Capabilities

- `landing`: the performance budget of the landing page. `landing-v2-and-product-video` adds the content requirements to the same capability.

### Modified Capabilities

None.

## Impact

- `apps/web` (landing page, hero mock, theme and settings plugins, Nitro config), `quality/lighthouse-budgets.json`, the Lighthouse evaluator, ADR-0038.
