# Proposal

## Why

Owner feedback (2026-11-08), in the owner's words: "We need to make simple settings light and put the most important settings for non advanced users. Be a UX expert to make the usage of RetroBoard easy and offer the most advanced customization in advanced mode for advanced users."

Simple and Advanced exist (`simple-advanced-mode`, spec `ui-modes`), but simple is not simple. An audit of the code (2026-11-08, table in `design.md`) finds, in simple mode: 7 control groups on the creation page (title, password, theme, ambient effects, format, a solo switch and a presenter-menus switch), 15 on the board options dialog (including two text-size pickers, four destructive buttons and a role switch) and 11 on the profile (including chat status, "present groups" and a default theme). Several of them are personal comfort settings or expert switches that a facilitator opening a first board does not need, and the creation page has no place for the one decision that shapes a retro: whether it has a timed agenda.

The product promise is "one link, and the team is in". A new facilitator should reach a working board in three interactions, find the six things she may need during the retro without reading, and never wonder whether a switch will break something. Teams who want to tune everything keep every option, one click away.

## What Changes

- **A rubric and a catalogue.** Every setting and control gets a class (essential, occasional, expert) from a four-question rubric, recorded as data (`settings-catalogue`) next to the code. A unit test enforces **budgets** on what simple mode may show, so it cannot silently grow back.
- **Creation page, simple:** four control groups and Create: title, theme, format, timed agenda (one switch, on by default). The password is automatic with a one-line copy affordance; the custom password and generator, ambient effects, solo and presenter-menu switches, team, project, facilitation, voting and the agenda editor move to advanced. "Try solo" stays a footer link. When a previous board of the team exists, one tap offers to bring its open actions.
- **Board options, simple:** four visible groups in a fixed order (Retro, Votes, Access, Columns and format) and a collapsed "Reset and delete"; the budget leaves room for two more. Everything else is advanced, grouped and ordered by use.
- **Profile, simple:** seven items (name, show my name, colour, language, light or dark, sound, a one-line privacy summary). Comfort settings move to advanced under "Appearance", "Notifications" and "Privacy".
- **One-click escape hatch.** Every simple surface ends with "Show all options" that switches the mode in place (the dialog stays open, state is kept, focus moves to the first new group, the change is announced), and advanced offers "Back to simple". The choice is remembered per device.
- **Search in advanced.** The options dialog and the profile get a filter field in advanced mode that matches labels and hints (accent and case insensitive), so a rarely used setting is found by name instead of by scrolling.
- **Plain wording.** Labels are verb-led sentences, hints one line, no jargon (no "P2P", "ledger", "vote spread" in simple mode), fr and en lengths checked at 360 px.
- **Secondary tools tucked away on the board toolbar in simple mode** (history, filter, activity, writing, boards switcher behind a "More" menu; share, people, actions, chat, present, export, options and undo stay in view). Gated by a short usability check; dropped if it does not beat today's toolbar.
- The user guide and the docs describe both modes and are regenerated (`docs:check`).

Out of scope: new settings, new features, changing a default's meaning, renaming stored keys, a settings sync across devices, the per-feature options owned by other changes (chat dock, notifications, column collapse), which land in the class the rubric gives them.

Bounded contexts: none of the domain. Web only (local personal settings, set-up surfaces), plus the user guide. No protocol change, no relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-modes`: budgets, the simple sets of each surface, the escape hatch, search in advanced, wording rules.

## Impact

- Web: `new.vue`, `BoardSetupForm`, `OptionsDialog`, `ProfileDialog`, `AppToolbar`, `ModeSwitch`, a small `SettingsSearch` component and a `settings-catalogue` util, fr and en keys.
- Tests: a catalogue budget unit test, e2e per surface and the time-to-first-board scenario.
- Docs: user guide manifest (creation and options steps, a new "Simple and advanced" step), `docs/design-system.md` section on settings.
