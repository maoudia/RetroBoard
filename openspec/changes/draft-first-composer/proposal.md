# Proposal

## Why

Field test by the owner (2026-10-25): the composer puts "Publish now" as the primary button on the right and "Add" as a secondary button on the left. People clicked "Publish now" for every idea instead of writing several drafts and publishing them together, which is the intended flow. The owner asked for "Add" on the right as the main action and "Publish now" on the left.

## What Changes

- **Button order.**
  - "Add" (to my drafts) becomes the primary button and sits on the right, where the eye ends and the thumb rests.
  - "Publish now" becomes a secondary button on the left.
  - The same order applies on phones.
- **Keyboard unchanged.** Enter adds a draft, Ctrl or Cmd+Enter publishes now, Shift+Enter adds a line.
- **Publish the drafts.** "Publish (n)" for the column's drafts stays as it is, as the main way to publish.

## Out of scope

- The full composer redesign (`publishing-ux-redesign` 2.1 and 2.2), which keeps this order.

## Bounded contexts

- Ideation (UI only).

No relay traffic.

## Capabilities

### Modified Capabilities

- `notes`: composer actions order.

## Impact

- Web: `PrivateSection.vue` and its styles; e2e selectors are unchanged (`compose-add-*`, `compose-publish-*`).
