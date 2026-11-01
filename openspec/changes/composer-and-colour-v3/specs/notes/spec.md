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

### Requirement: Advanced palette with coherent colours
The palette SHALL offer an advanced mode with more colours that all come from curated sets derived from the board theme; it SHALL NOT offer a free colour, and every offered colour SHALL keep a text contrast of at least 4.5:1 with the note ink.

#### Scenario: More shades
- **WHEN** Alice opens the advanced palette on a note
- **THEN** she sees extra shades and harmonies of the theme colours, and no free colour picker

### Requirement: Cluster colour
A participant SHALL be able to recolour a whole cluster at once from the cluster panel (one command), which recolours every note of the cluster except the frozen ones.

#### Scenario: Recolour a cluster
- **WHEN** Alice picks blue for the cluster "Deploys"
- **THEN** every note of the cluster turns blue for everyone

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
