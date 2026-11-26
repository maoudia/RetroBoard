# Proposal

## Why

With many ideas, notes become hard to read and to group. Colours should feel like real sticky notes, and animations should make the board feel alive without hurting readability.

## What Changes

- Canonical sticky-note palette (8 classic colours) per theme variant, AA contrast guaranteed.
- Masonry layout per column, text fitting with a minimum size and "read more", density levels, zoom, focus mode on a column, search and filter (author, colour, has votes).
- Cluster visuals (stacked paper with folded corner), magnetic snap when grouping.
- Animations: peel on hover, stick on publish, paper flutter, snap, all reduced-motion aware.
- Similar-idea hint while writing (local text similarity).

Out of scope: free-form canvas (notes stay in columns).

## Capabilities

### New Capabilities

- `note-presentation`: readability, layout and motion rules for notes at scale.

### Modified Capabilities

None.

## Impact

- `packages/ui`, `packages/themes`, web board components.
