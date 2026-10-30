# Proposal

## Why

Owner feedback (2026-10-30): "Replace and clear" is good, but a facilitator also needs to change the board type (format) and keep the work: migrate every existing note to the new columns. Today `template.apply` with notes on the board only accepts `wipe: true`, which deletes notes and clusters for the whole team.

## What Changes

- The format dialog offers two choices when the board has notes: "Replace and clear" (unchanged) and "Change and keep notes".
- `template.apply { templateId, mode: 'wipe' | 'migrate' }`. In migrate mode the new columns replace the old ones and every note moves by position:
  - Old column i goes to new column i.
  - When the new format has fewer columns, the extra columns go to the last new column, in their order.
  - When it has more, the extra new columns start empty.
- Clusters move with their notes (a cluster stays whole). Votes, colours, authors, drafts, actions and their links stay. The order inside a column is kept, and migrated columns are appended in old column order.
- The confirmation shows the mapping before applying ("Went well -> Keep", "Went wrong + Ideas -> Change") so nobody is surprised.
- The command is facilitator-only, like the current one. The mapping is computed in the domain, so every peer reaches the same state.
- The old `wipe?: boolean` field stays accepted for older peers (`wipe: true` = mode `wipe`).

Out of scope: a manual column-by-column mapping editor (later, if asked), migrating the agenda (the agenda keeps its phases).

Bounded contexts: Facilitation (domain), Presentation (dialog). One command; no extra traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `retro-templates`

## Impact

- `packages/domain` (facilitation handler, pure mapping function), `packages/protocol`, `packages/application` (command and a `templateMapping` read model for the preview), `TemplateDialog.vue`, i18n fr and en, unit and e2e tests.
