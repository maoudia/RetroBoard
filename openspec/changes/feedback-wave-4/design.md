# Design

## Context

All ten items are UI-layer corrections found on the live app. Existing building blocks: layout book per screen class (`writeCol`, `writeHCol`), `Dropdown`, `PillSelect`, presence peers (`name`, `key`, `role`), design tokens (`--fs-*`, `--r-*`, `--sp-*`).

## Decisions

- **Writing-area sizing (item 6).** The Write toolbar button stays a pure show/hide. Size lives where the eye is: the writing area header carries a segmented S M L control (text size of that column), a link toggle ("same size for every column") and the existing grip (drag or arrow keys = height, double-click = reset). No menu, no hidden entry. Rejected: chevron on the toolbar button (hidden, ambiguous scope), a per-column menu entry (too deep), a global slider (loses per-column control that was requested).
- **One toggle component (item 8).** A `ToggleSwitch` component (role switch, label, optional description, icon) replaces every ad-hoc on/off button; documented in `docs/design-system.md`; the design-token test covers it.
- **Voting menu (item 8).** State is shown once (pill in the header), settings below are phrased as actions the user can take, labels at most three words, Lucide icons that match the meaning (vote, lock, eye-off, hash, rotate-ccw).
- **Peer colour and avatar (item 9).** Each client broadcasts its profile (name, colour index, avatar id) on connect and when it changes; the participants menu and chat read the broadcast profile, falling back to a neutral colour only until it arrives. Pure display data, never trusted for authority.
- **Chat status (item 1).** Status line "connected, on the conversation" is derived from presence (`conn`, tab visibility). It is shown by default and a profile preference `chatStatus` (default on) hides it; the preference is local.
- **Hide for now (item 5).** The action is a personal view setting; it must not depend on facilitator role at all. Finding: the e2e probe (two participants, open facilitation) shows the action works; the report could not be reproduced. The refusal path was silent, so a refused hide now always shows its reason as a toast.
- **Encryption indicator (item 10).** `ShieldCheck` when end-to-end encrypted, `ShieldOff` otherwise; tooltip on hover and focus, popover on tap with the explanation and a link to the security page.

## Risks

- Peer profile broadcast may already exist under another name: verify before adding a message type.
- Mobile floor banner: test at 320, 360 and 390 px.
