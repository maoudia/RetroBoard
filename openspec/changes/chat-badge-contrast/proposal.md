# Proposal

## Why

The unread count on the chat button is white text on `--danger` (`apps/web/app/components/ChatPanel.vue`). Measured from the theme tokens with `contrast()`, white on `--danger` is 2.26 to 2.82:1 in all nine dark variants, under the 4.5:1 that the themes spec requires for text. The token tests did not catch it because they check token pairs, not the colours a component pairs together. The ink the themes already define for text on a danger-coloured surface, `--accent-ink`, reaches 5.49:1 or more in all 18 variants.

## What Changes

- The unread badge of the chat button uses `--accent-ink` on `--danger`.
- A unit test keeps `accentInk` on `danger` at 4.5:1 in every variant of every theme, so a new theme cannot reintroduce the failure.

Out of scope: the other derived states (pressed toolbar buttons, placeholders), forced colours, the accessibility gate on pull requests.

Bounded contexts: UI (themes). No relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `themes`: the unread badge is readable in every variant.

## Impact

- `apps/web/app/components/ChatPanel.vue`, `packages/themes/test/themes.test.ts`. Every theme, both variants; no format.
