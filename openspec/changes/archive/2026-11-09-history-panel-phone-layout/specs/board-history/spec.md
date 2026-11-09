## ADDED Requirements

### Requirement: History entries never collide
Each entry of the history panel SHALL show its time, its author and what changed in one block, and its restore action on one line with its icon and a short label; no part of an entry SHALL overlap another entry, whatever the screen width from 320 px to a TV.

#### Scenario: Phone
- **WHEN** a facilitator opens the history panel on a 360 px wide phone with forty entries
- **THEN** every entry's restore button is on one line, fits inside the panel, and no entry's box intersects the next one

#### Scenario: Long author or idea text
- **WHEN** an entry holds a long unbroken word
- **THEN** the text wraps inside its block and the restore button stays visible

### Requirement: Short restore label, full accessible name
The restore button SHALL read "Restore" (fr "Restaurer"), its target SHALL be at least 40 px tall, and its accessible name SHALL still name the action it restores before.

#### Scenario: Screen reader
- **WHEN** a screen reader reaches the restore button of the entry "Alice grouped Slow CI"
- **THEN** it announces "Restore before: Alice grouped Slow CI"

### Requirement: The panel fits the screen
The history panel SHALL fit inside the visible screen, above any bottom bar of the app (presenter bar, voting bar) and inside the safe areas, with a single scroll area that signals when more entries exist; it SHALL stay open when the mobile browser bar collapses or expands.

#### Scenario: Presenter bar
- **WHEN** a facilitator opens the history panel in presentation mode on a phone
- **THEN** the panel's bottom edge is above the presenter bar and the list scrolls inside the panel

#### Scenario: Browser bar collapses
- **WHEN** the visual viewport height changes while the panel is open
- **THEN** the panel stays open and is placed again inside the new height
