# Proposal

## Why

The agenda ring is a single segmented circle. The owner wants the motivating look of activity rings: a global ring for the whole retro and inner rings for the parts of the retro, so everyone sees at a glance where the team is and how much time is left, styled by each theme.

## What Changes

- Concentric rings: the outer ring is the whole retro (elapsed over planned), inner rings show the current phase and the next one; completed phases close their ring with a short celebration.
- Overtime continues the ring past a full turn in the overtime colour (like exceeding a goal), never a negative number.
- Ring colours, thickness, glow and celebration come from theme tokens (`--ring-1..3`, `--ring-track`, `--ring-over`), so every theme has its own rings.
- Compact ring in the toolbar, large rings in presenter mode and in the agenda panel.

Out of scope: the agenda logic (exists), talk time ring (talk-time).

Bounded contexts: Facilitation (presentation only). No relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `retro-agenda`: rings display.
- `themes`: ring tokens per theme.

## Impact

- Web: AgendaRing rewritten as `ActivityRings` (SVG, CSP-safe, no canvas); themes: ring tokens for every theme with a contrast check.
