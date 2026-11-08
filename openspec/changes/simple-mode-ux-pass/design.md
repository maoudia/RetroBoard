# Design

## Rubric

A setting is **essential** when it answers "yes" to Q1, or to both Q2 and Q3, and to Q4:

1. **Q1** Is it needed to run a first retro? (a retro cannot start or finish sensibly without choosing it)
2. **Q2** Do most teams change it from its default?
3. **Q3** Does a wrong default hurt (leaks something, blocks someone, loses work)?
4. **Q4** Can one plain sentence of fewer than 12 words explain it to a first-time facilitator?

**Occasional** (O): changed by some teams for some retros, or personal comfort. **Expert** (X): changes how the machine works, needs vocabulary, or serves a narrow case. Simple shows only E. Everything is reachable in advanced.

## Audit (2026-11-08)

S = shown in simple today, A = advanced only. "Group" counts one visible control group (a switch, a stepper, a picker, a field).

### Creation page (`/new`, `BoardSetupForm`, `AgendaEditor`)

| # | Control | Today | Class | Proposal |
|---|---|---|---|---|
| C1 | Board title | S | E | Keep |
| C2 | Password (generated) / own password and generator | S field, generator A | E automatic, X custom | Simple: automatic, one line with copy; advanced: choose or generate |
| C3 | Theme picker | S | E | Keep (ADR-0006, a differentiator) |
| C4 | Ambient effects switch | S | X (personal, some themes) | Advanced (also in profile) |
| C5 | Format picker (13) | S | E | Keep; "Not sure? Help me choose" opens the wizard first |
| C6 | Solo mode switch | S | O | Footer link "Try solo" (exists), switch removed from the card |
| C7 | Presenter hides menus switch | S | X (personal) | Advanced and profile |
| C8 | Timed agenda on or off, total duration | A (editor) | E on/off, X phases | Simple: one switch, on by default, duration from the format; advanced: editor |
| C9 | Agenda phases and durations | A | X | Advanced (editor) |
| C10 | Start the agenda now | A | O | Advanced |
| C11 | Phase rules, auto-publish, chained phases | A | X | Advanced |
| C12 | Team | A | O | Advanced; simple reuses the last team silently |
| C13 | Project | A | O | Advanced |
| C14 | Carry over open actions | A | O, high value | Simple: one-tap offer when a previous board of the team exists |
| C15 | Who facilitates (everyone or one) | A | O | Advanced (default: everyone) |
| C16 | Voting on or off | A | O | Options (simple) |
| C17 | Votes per person | A | O | Options (simple) |
| C18 | Secret voting | A | O | Options (simple) |
| C19 | Which columns are votable | A | X | Advanced |
| C20 | Announce arrivals | A | X | Advanced |

Simple today: C1 to C7 = **7 groups**. Proposed: C1, C3, C5, C8 = **4 groups** plus Create.

### Board options (`OptionsDialog`)

| # | Control | Today | Class | Proposal |
|---|---|---|---|---|
| O1 | Board name | S | E | Keep |
| O2 | Note size (3 steps) | S | O | Advanced ("Look") |
| O3 | Note text size (3 steps) | S | O | Advanced ("Look") |
| O4 | Note length limit | A | X | Advanced |
| O5 | Voting on or off | S | E | Keep ("Votes") |
| O6 | Votes per person | S | E | Keep |
| O7 | All votes on one idea | A | X | Advanced |
| O8 | Votes per idea cap | A | X | Advanced |
| O9 | Votable items (notes, clusters, both) | A | X | Advanced |
| O10 | Votable columns | A | X | Advanced |
| O11 | Secret voting | S | E (Q3: leaks) | Keep ("Votes") |
| O12 | Announce arrivals | A | X | Advanced |
| O13 | Lock the board | S | E | Keep ("Access") |
| O14 | Allow browser agents | A | X | Advanced |
| O15 | Everyone facilitates | S (steerers) | O | Advanced ("Access") |
| O16 | Actions as checkbox or workflow | A | O | Advanced ("Actions") |
| O17 | Talk time: mode, budget, self start (3 controls) | A | X | Advanced ("Talk time") |
| O18 | Theme | S | O | Keep ("Look"): one picker |
| O19 | Add a column, change format (2 buttons) | S | O | Keep as one group "Columns and format" |
| O20 | Reset votes, reset clock, reset board, destroy (4 buttons) | S | O, destructive | Collapsed disclosure "Reset and delete" (still simple) |
| O21 | Mode switch | S | E | Replaced by the in-context escape hatch |

Simple today: O1 to O3, O5, O6, O11, O13, O15, O18, O19 (2), O20 (4) = **15 groups** (counting the two buttons and four destructive buttons separately). Proposed: Retro (O1, O18), Votes (O5, O6, O11), Access (O13), Columns and format (O19) = **4 groups plus one collapsed disclosure** (O20); the budget below allows six visible groups.

### Profile (`ProfileDialog`)

| # | Control | Today | Class | Proposal |
|---|---|---|---|---|
| P1 | Name, show my name | S | E | Keep (one group) |
| P2 | Avatar colour | S | O (delight) | Keep, inline with the name |
| P3 | Display mode | S | E | In-context escape hatch + one row at the end |
| P4 | Language | S | E | Keep |
| P5 | Light or dark | S | E | Keep |
| P6 | Default theme for new boards | S | O | Advanced ("Appearance") |
| P7 | Present groups open | S | O | Advanced |
| P8 | Ambient effects | A | X | Advanced |
| P9 | Motion (auto, reduced) | A | X (follows the system by default) | Advanced |
| P10 | Density | A | X | Advanced |
| P11 | Keyboard shortcuts, key hints (2) | A | X | Advanced |
| P12 | Notification position | A | X | Advanced ("Notifications") |
| P13 | Stepper time, ring time (2) | A | X | Advanced |
| P14 | One-minute warning | A | O | Advanced ("Notifications") |
| P15 | System notifications | A | O | Advanced ("Notifications") |
| P16 | Chat header status | S | X | Advanced |
| P17 | Sound at the end of a timer | S | O | Keep (plain, audible surprise) |
| P18 | Keep boards on this device for... | S | E (privacy) | Keep as a one-line summary with a "Change" link |
| P19 | Share my pointer | S | O (privacy) | Advanced ("Privacy") |
| P20 | Direct links between browsers, show pointers (2) | A | X | Advanced ("Privacy") |

Simple today: P1 to P7, P16 to P19 = **11 groups**. Proposed: P1, P2, P4, P5, P17, P18 and the mode row P3 = **7 rows**.

### Board toolbar (`AppToolbar`)

Today (same in both modes, 16 buttons): share, people, undo, redo, history, actions, chat, filter, presenter, writing, export, activity, options, boards switcher, light or dark, profile. Proposed simple: share, people, actions, chat, present, export, options, undo and profile in view (9), history, redo, filter, activity, writing, boards switcher, light or dark in a **More** menu. Advanced unchanged. Gated (task 6.1).

## Budgets (enforced by a unit test over the catalogue)

| Surface | Simple budget |
|---|---|
| Creation page | at most 4 control groups plus Create |
| Board options | at most 6 visible groups plus 1 collapsed disclosure |
| Profile | at most 7 rows |
| Toolbar | at most 9 buttons in view |

A change that adds a simple-mode control must lower another one or raise the budget in the same pull request with the reason; the test failure names the surface and the controls.

## Settings information architecture

- **Order** within a surface: what the person came for first (name, votes, access), look and format next, rare things last, destructive last of all, always visually separated.
- **Groups** are named by intent, not by technology: Retro, Votes, Access, Look, Columns and format, Actions, Talk time, Reset and delete (options); Identity, Appearance, Notifications, Privacy (profile).
- **Labels**: sentence case, verb-led when they act ("Hide vote counts until I reveal them"), no abbreviations; **hints**: one line, at most 90 characters, saying the consequence.
- **Defaults** carry the load: simple users must never need advanced to get a good retro. The defaults audited: agenda on, open facilitation on, password on, drafts private, 3 votes.
- **Design system** (`docs/design-system.md`): only `ToggleSwitch`, `pick-seg`, `.grp h3`, `--fs-*`, `--r-*`, `--sp-*`; one primary action per view (Create, Done); state in words ("On", "Off"), never colour alone.

## Escape hatch and search

- A button "Show all options" at the end of each simple surface calls `settings.patch({ uiMode: 'advanced' })` in place. Dialogs stay open and keep their scroll and values; focus moves to the first group that appeared; a polite announcement says how many options were added. "Back to simple" at the end of advanced does the reverse and never loses a value (hidden is not reset).
- Search (advanced only) is a `SettingsSearch` input at the top of options and profile. It filters the rows of the catalogue by label and hint with `foldText` (accents and case folded), keeps group headings of matching rows, shows "No setting matches" with a clear button, is a `role="search"` landmark with a live count, and clears on Escape.

## Storage and migration

`uiMode` already lives in the local settings (`retroboard:settings`). No key is renamed or removed and no value is rewritten: users in advanced see exactly what they saw; users in simple see fewer groups, and every value they set earlier keeps applying (only its control moves). The catalogue is the single source for which surface shows what, so the profile dialog, the options dialog and the guide read the same classes.

## Wording and layout

French is the source and is the longest: every new label and hint is checked at 360 px with the pseudo-locale test and on TV scale. Plain words replace jargon in simple mode ("Direct links between browsers" stays in advanced where the person asked for detail).

## Measures and acceptance

- **Time to first board**: from the landing page, create a board using only defaults in at most 3 interactions (open Create, press Create, enter a name), scripted as an e2e that counts clicks and fields; the format and theme are preselected.
- **Surface budgets** as above, enforced by the unit test.
- **Nothing lost**: every setting of the catalogue is reachable in advanced and is found by the search by its label.
- **Usability check** (task 6.1): five facilitators who have never used the product create a board and run one vote with the proposed toolbar and with today's; the proposal ships only if it is faster or no slower and nobody fails to find Undo, Share and Options.

## Where things live

| Type | Layer | Notes |
|---|---|---|
| `settings-catalogue` (id, surface, class, group, label key, hint key) | web util | data only, shared by the budget test, the search and the guide manifest check |
| `SettingsSearch.vue`, `ModeEscape.vue` | web components | |
| surface components | web | edited to read the catalogue's simple flag |

## Security and privacy note

Everything is local and personal: no event, no protocol field, nothing the relay can see. The password line shows the generated secret to its owner only, as today.

## Risks

- A facilitator in simple mode cannot find a setting she needs: mitigated by the escape hatch on every surface and by search once in advanced.
- Moving settings breaks e2e and guide screenshots: the change updates them in the same task groups, and `docs:check` fails on a stale guide.
- Disagreement on what is essential: the rubric and the catalogue make the call explicit and cheap to revise in review.
