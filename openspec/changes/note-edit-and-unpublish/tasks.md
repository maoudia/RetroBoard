# Tasks

## 1. Domain and protocol

- [ ] 1.1 `note.unpublish { id }` in `packages/protocol` (valibot schema, size limit as delete) and the ideation handler with the error order locked, not-found, forbidden, frozen, voting-closed; `touchesFrozen` lists it; cluster normalised as for delete; verify unit tests for every refusal and for the author, the facilitator and a stranger, and 100% mutation score of the new code
- [ ] 1.2 Rolling-update behaviour: a presence capability flag for the command and the menu item hidden unless every present peer announces it; verify a unit test of the gate and an e2e with a peer announcing no support

## 2. Application

- [ ] 2.1 `unpublishNote(id)` use case, `inverseOf` entry (re-add with column, text, colour; no redo), history kind and label `unpublish`, rewind treats it as a delete; verify unit tests including undo after the cluster dissolved
- [ ] 2.2 `recoveredDrafts(before, after, me)` read model and the draft-store port: my notes removed by an unpublish event go to the top of the stack of their column, once per event id (ids kept locally); verify unit tests for replay, two tabs and a late join, and that another person's note is never added

## 3. Edit in the writing zone

- [ ] 3.1 Composer edit mode in `PrivateSection` (text and colour loaded, Save and Cancel, `note.edit` and `note.color` on save, being-edited presence mark); verify e2e with two contexts (the other sees the old text until the save) and axe
- [ ] 3.2 Drag a note onto the writing zone and the "Edit" item of the 3-dot menu both open it; drop hint "Edit here", disabled reasons as tooltips; fr and en; verify e2e drag and menu on desktop and a phone, keyboard path and the live announcement

## 4. Unpublish

- [ ] 4.1 "Back to my drafts" in the 3-dot menu and the drop on the draft stack, confirmation with the vote count and for a pinned idea, notice to the author when a facilitator did it, reverse flight with the reduced-motion fallback; verify e2e with three contexts (author, facilitator, observer), a closed vote and a locked board
- [ ] 4.2 Undo and history in the UI ("sent back to drafts"); verify e2e undo and facilitator restore

## 5. Guide and docs

- [ ] 5.1 Guide manifest step and fr/en text for "take an idea back" in the Write chapter, regenerate with `pnpm docs:tour && pnpm docs:guide`; verify `pnpm docs:check` and the guide e2e
