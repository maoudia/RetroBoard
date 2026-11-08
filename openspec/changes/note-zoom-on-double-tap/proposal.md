# Proposal

## Why

Owner feedback (2026-11-08): a post-it on the board is often too small to read, especially long ones on a phone or on a shared screen, and the enlarged view that presentation mode uses for the most voted ideas is exactly what people want on demand. The owner wants a double tap on a post-it to open it in that zoomed way.

## What Changes

- **Zoom on demand.** A double tap (touch) or double click (mouse) on a post-it opens it enlarged over a dimmed board, in the same card as the presenter's spotlight and the most-voted walk-through: the column name, the full text sized to its length, the previous and next idea of the column, the position ("3 of 7") and a close button.
- **Read-only and local.** The zoom changes nothing on the board and sends nothing: it is a view on this device, available to everyone, in presentation mode or not.
- **One component, two modes.** The spotlight card becomes a shared `NoteZoom` component. In presentation mode it keeps its current behaviour (non-modal, driven by the presenter); outside it, it is a modal dialog with a focus trap that returns the focus to the note.
- **Keyboard and menu.** `z` zooms the focused note (Enter keeps editing it), and the 3-dot menu gets a "Zoom" item, so the feature is discoverable and does not depend on a gesture (WCAG 2.5.1, 2.5.7).
- **Gesture rules.** Two taps within 300 ms and 10 px zoom; a drag, a long press, a tap on the vote button, the 3-dot menu, the cluster fold or an idea being edited never zoom, and a single tap is never delayed (the first tap of a pair does what it always did, nothing, so no waiting).
- **Clusters.** A double tap on a cluster's stack opens the zoom on its first idea and steps through the ideas of the cluster, with the cluster title as the heading.

Out of scope: editing from the zoom (a button leads to the existing edit), zooming private drafts of other people (they are not on the board), pinch to zoom, sharing the zoom with others (that is the presenter's spotlight).

Bounded contexts: Presentation (read side, local UI state only). No domain, protocol or relay change; no free-plan impact.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `presentation`: the note spotlight view is available to everyone as a zoom.
- `keyboard`: a shortcut to zoom the focused note.

## Impact

- Web: `PresenterSpotlight` becomes `NoteZoom` (shared), note card gesture, `NoteMenu` item, shortcut table, i18n fr and en, guide step.
- Tests: component logic for the gesture, e2e on desktop, phone and TV widths, axe.
