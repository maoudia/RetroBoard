# Proposal

## Why

Owner note (2026-11-20): "A beautiful animation when a note reaches done, creative, per theme, can be deactivated in advanced mode."

Today one effect serves every theme: `ActionsDrawer.vue` fires `confetti()` (`apps/web/app/utils/fx.ts`) from the click handler of the person who ticks an action, with the theme's note colours. Nobody else sees it, a done action seen from the board gives nothing, the effect has no relation to the theme the facilitator chose, and there is no switch. Closing the loop on an idea is the emotional payoff of a retro, so it deserves a considered, themed moment that stays calm, accessible and cheap.

## What Changes

- **A celebration when an idea reaches done.** The moment the action born from a post-it (or a cluster) goes to done, the post-it on the board plays a short themed animation (about 1.2 s), and the action row in the drawer plays the same one. It is driven by the board state, not by a click: it plays on every device that sees the status change live, and never on replay, history load or when a device joins and catches up.
- **One signature per theme.** Each theme in `packages/themes` names its celebration (data only: a stable id and a palette taken from the theme tokens); the web app owns the rendering. Proposed set, subject to the owner's approval in the pull request screenshots: `color` confetti burst (today's effect, kept), `sticky` a check stamp that peels and sticks, `paper` an ink stamp "done" that lands with a small bounce, `corporate` a quiet check that draws itself, `minimal` a single line that strikes through, `slate` a chalk tick, `cyber` a scan line and a neon check with a short glitch, `halloween` a small ghost that floats up, `noel` a soft snow burst, `sakura` drifting petals, `studio` a spotlight sweep. Each is CSS or a few canvas particles, no library, no sound.
- **Calm by rule.** One celebration at a time per device (a queue of at most 3, extra ones collapse into one combined burst), none while presenting unless the presenter has the animations on, none under reduced motion or `motion: reduced` (a static check mark appears for 600 ms instead), never blocking input, never taking focus, announced to screen readers through the existing polite live region ("Idea done").
- **Off switch in advanced mode.** A personal setting "Celebrations when an idea is done" (on by default) in Profile, shown in advanced mode; simple mode keeps it on. The setting is part of the synced preferences (`user-drive-storage`).

Out of scope: sound (the existing `sound` setting is not extended), a board-wide switch chosen by the facilitator (the existing theme animation toggle at creation stays about the ambient layer), celebrating a vote, a phase or the end of the retro, user-uploaded effects.

Bounded contexts: Presentation and Themes (web read side and the themes package data). No domain, protocol or relay change; the effect is derived from events already exchanged, so the free-plan budget is unaffected.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `themes`: each theme owns a celebration for a finished idea.
- `ui-modes`: the personal celebrations switch in advanced mode.

## Impact

- `packages/themes` (a `celebration` field per theme), `apps/web/app/utils/fx.ts` (the effect engine and queue), a `useDoneCelebration` composable reading the board store, `NoteCard.vue`, `GroupCard.vue`, `ActionsDrawer.vue`, `ProfileDialog.vue`, `stores/settings.ts` and the synced settings list, i18n fr and en, guide step, design tokens for the effect durations (no raw sizes: `apps/web/test/design-tokens.test.ts`).
- Tests: unit (queue, collapse, reduced motion, no play on replay), e2e (one theme per family, off switch, reduced motion, no CSP violation, axe), screenshots of each effect at 3 frames reviewed in the pull request.
