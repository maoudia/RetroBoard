# Proposal

## Why

Owner feedback (2026-10-25): most teams do not need a single person in charge. The board creator must be able to choose "no facilitator", where every facilitator feature is available to everyone, and this must be the default. Today "facilitation open to everyone" exists as a hidden setting, off by default, and it also lifts the phase rules, so an open board loses its agenda.

## What Changes

- **Creation choice**, default first:
  1. "Everyone facilitates" (default): phases, timers, talk turns, vote closing and reveal, theme, settings and moderation are available to every participant. No crown, no lead.
  2. "One facilitator": today's model, refined by single-facilitator (creator leads, takeover by link, handover).
- The choice can be changed later from the board options. Switching the mode needs the facilitator capability (the creator or a facilitator link holder), even on an open board, so the mode cannot flip-flop between participants. No new role state.
- **Phase rules apply to everyone on an open board**: anyone can move to the next phase, but nobody can add notes during the Vote phase, for instance. Today open facilitation lifts the rules; this is a behaviour change.
- The share panel on an open board shows one link; the facilitator link moves to "Advanced" (still needed to switch modes).

Out of scope: per-feature permissions (who may reveal votes, who may change the theme). One switch only.

Bounded contexts: Access (ledger rule), Facilitation (default setting), Board session (creation). No new relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `facilitation`: facilitator by creation only in "One facilitator" mode; privileged actions open by default; phase rules for everyone.
- `board-session`: facilitation choice at creation.

## Impact

- Domain: `settings.openFacilitation` defaults to true for new boards (existing boards keep their stored value); ledger keeps phase rules on open boards; `settings.update.openFacilitation` requires the facilitator capability key.
- Web: creation form choice, options toggle, crown and lead UI hidden on open boards, share panel layout.
- ADR-0021 records the default.
- single-facilitator applies to "One facilitator" boards only and lands after this change.
