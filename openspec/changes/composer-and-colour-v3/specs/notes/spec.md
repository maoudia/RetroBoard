## ADDED Requirements

### Requirement: Colour while writing
The composer SHALL let the author pick the note colour before publishing, and the published note SHALL keep it.

#### Scenario: Pick a colour
- **WHEN** Alice picks the green swatch in the composer and publishes
- **THEN** the note appears green for everyone

### Requirement: Default note length
A new board SHALL accept notes of up to 160 characters unless the facilitator changes the setting; existing boards SHALL keep their limit.

#### Scenario: New board
- **WHEN** a facilitator creates a board without touching the note length
- **THEN** notes are limited to 160 characters

### Requirement: Free colour with a contrast guard
The detailed palette SHALL offer a free colour as its last option and SHALL never produce a note whose text contrast is under 4.5:1.

#### Scenario: Too light
- **WHEN** a participant picks a very light yellow with light ink
- **THEN** the ink switches to the dark ink or the colour is refused with a reason

### Requirement: Compact composer
The composer SHALL show the character counter only from 80% of the note length, SHALL keep its hint to one short line with the keyboard tips in a help popover, and SHALL offer the signature as two named toggles (my name, anonymous).

#### Scenario: Counter appears late
- **WHEN** a participant types 30 characters in a 160-character composer
- **THEN** no counter is shown, and from 128 characters it reads "128 / 160"

#### Scenario: Signature toggles
- **WHEN** Alice presses the anonymous toggle
- **THEN** the anonymous toggle is pressed, the next notes are anonymous and earlier notes keep their author display

### Requirement: No palette on hover
A published note SHALL NOT show a colour palette on hover; its colour stays in the note menu and the palette sheet.

#### Scenario: Hover
- **WHEN** a pointer rests on a published note
- **THEN** no colour swatches appear
