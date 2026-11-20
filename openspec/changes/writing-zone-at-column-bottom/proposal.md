# Proposal

## Why

Owner feedback (2026-11-20, with a screenshot of the Improve column on a narrow layout): putting the writing zone at the top of every column (change `publishing-ux-redesign`) "is a disaster". The blue "Write here." note, its "Only you see this until you publish." line and its publish controls push the published notes down by a full screen on a phone-width column, so a participant reading the board has to scroll past their own empty composer in every column. The owner keeps the design of the zone and wants it moved to the bottom of the column.

## What Changes

- **The writing zone moves to the foot of its column.** In every column the order becomes: column header, published notes, writing zone. The zone keeps its look unchanged: the same blue note field, the same "only you see this" line, the same size picker, signature, colour, help, add and publish controls.
- **It stays visible.** The column is already as tall as the board and its notes scroll inside it, so the zone is bottom-anchored by layout: it never scrolls out of view and nobody scrolls past a long column to reach it (no `position: sticky` needed, see the design).
- **The drafts tray goes above the field.** Drafts stack up toward the field instead of pushing it away, so the field stays at the same place while ideas are added.
- **A new published idea comes into view.** Notes are listed oldest first, so a new one lands at the end of the column, just above the zone; the column scrolls it into view (instantly under reduced motion, before the publish flight starts).
- **Keyboard and screen readers.** The focus order follows the reading order (column title, notes, writing zone). A "Go to the writing area" link, visible on focus, is the first stop after the column title so that nobody tabs through a long column to write.
- **Fold direction.** Folding the zone (double chevron) slides it down and the handle that brings it back is at the foot of the column, with chevrons pointing the way. The separators are at the top of the zone.
- **Phones keep the bottom sheet.** Under 600 px the composer is still opened by the write button and slides up as a bottom sheet; the column's drafts tray also sits at the foot now.
- **Docs.** The design system and the "Write" chapter of the guide (fr and en) say "at the foot of the column".

Out of scope: the composer itself (fields, shortcuts, edit mode of `note-edit-and-unpublish`), the size and fold persistence, the bottom sheet, the chat dock.

Bounded contexts: Ideation (web view only). No domain, protocol or relay change; no free-plan impact.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-layout`: where the writing zone sits in a column and that it stays reachable.

## Impact

- `apps/web/app/components/BoardColumn.vue` (order of the blocks, skip link), `PrivateSection.vue` (order inside the zone, fold icons, separator), `NoteCard.vue` (scroll a just published note into view).
- Tests: the e2e specs that assert the old order (`publishing-composer`, `publish-scenario` titles and steps) are updated, a geometry spec is added (zone below the notes on desktop, tablet and phone, in view with a long column).
- Docs: `docs/design-system.md`, `docs/user-guide/{fr,en}/write.md`, regenerated guide pictures.
- i18n: one new key (`private.skip`) in fr and en; the others keep their meaning.
