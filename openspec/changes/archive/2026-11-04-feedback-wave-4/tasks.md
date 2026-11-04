# Tasks

## 1. Chat (picture 1)

- [x] 1.1 Opaque chat panel; author colour and avatar on header and messages; verify e2e screenshot assertions (computed background alpha 1) and axe contrast
- [x] 1.2 Presence status line ("connected, on the conversation") on by default with a profile preference to turn it off; fr and en keys; verify e2e (default on, off after preference)

## 2. Dialogs and buttons (pictures 2, 3, 4)

- [x] 2.1 Action plan dialog uses a multi-line autosizing textarea with Ctrl/Cmd+Enter; verify e2e with a three-line action and unit test of the trimming
- [x] 2.2 Fix the Erase button in the profile dialog (no clipped outline, tokens only); verify e2e screenshot of focus ring not clipped
- [x] 2.3 Simple / Advanced switch restyled with the shared button style; verify design-tokens test and e2e

## 3. Columns and writing area (pictures 5, 6)

- [x] 3.1 "Hide for now" works when everybody is facilitator (find root cause, regression test first); verify unit and e2e with open facilitation
- [x] 3.2 Writing-area sizing redesign: grip drag, size chip, double-click reset, "Apply to all columns" in the Display popover, chevron removed from the Write button; verify e2e on desktop and phone, keyboard use, axe target size

## 4. Mobile (picture 7)

- [x] 4.1 "Has the floor" banner wraps and truncates without overflow at 320, 360 and 390 px; verify e2e with a long name and no horizontal scroll

## 5. Voting menu and toggles (picture 8)

- [x] 5.1 `ToggleSwitch` component, design-system doc, migration of every on/off setting; verify design-tokens test and e2e
- [x] 5.2 Voting menu deduplicated, short labels, meaningful icons; verify e2e and fr and en overflow check

## 6. Participants and encryption (pictures 9, 10)

- [x] 6.1 Participants menu shows each peer's chosen colour and avatar from the connect-time profile broadcast; verify e2e with two contexts
- [x] 6.2 Encryption shield icon with tooltip and tap explanation replaces the long text; verify e2e (hover, focus, tap) and axe
