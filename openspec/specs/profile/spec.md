# profile Specification

## Purpose
Local-only personal settings: name, avatar colour, appearance, recent boards and data wipe.

## Requirements

### Requirement: Local only
The system MUST keep profile settings in the browser and MUST NOT send them to the server, except the display name when joining a board.

#### Scenario: Wipe local data
- **WHEN** a person confirms "Erase everything on this device"
- **THEN** profile, settings, drafts and recent boards are removed from the browser

### Requirement: Duplicate names
A participant who joins with the name of someone already present SHALL be invited to choose another name or avatar.

#### Scenario: Second Alex
- **WHEN** Alex is on the board and another participant joins as alex
- **THEN** the newcomer sees a popup suggesting another name

### Requirement: Simple or advanced mode
A person SHALL be able to choose between a simple and an advanced mode, simple by default, remembered on this device; the mode only decides which options are shown.

#### Scenario: Switch from a dialog
- **WHEN** Alice switches to Advanced in the share dialog
- **THEN** the creation, share and export screens all show their advanced options from then on

### Requirement: Recent boards within reach
The boards this browser opened recently SHALL be listed where people land (home page, creation page, board title menu) and not only in the profile menu; the list SHALL stay on this device.

#### Scenario: Back from a board
- **WHEN** Alice leaves her board with the browser back button and lands on the creation page
- **THEN** her board is listed first under "Your recent boards" and one click reopens it

#### Scenario: Switch board
- **WHEN** Alice opens the board title menu
- **THEN** she sees her other recent boards and can open one

### Requirement: Profile settings follow the interface mode
The profile menu SHALL show the essential settings in simple mode and every setting in advanced mode; a hidden setting SHALL keep applying with its current value.

#### Scenario: Simple profile
- **WHEN** Alice opens her profile in simple mode
- **THEN** she sees language, theme variant and retention, and not density or motion
- **AND WHEN** she switches to advanced
- **THEN** density and motion appear

### Requirement: Rename reaches published notes
When a participant changes their display name, the system SHALL show the new name on the notes they already published as signed, for every participant. Notes published anonymously MUST stay anonymous. A name set by a facilitator rename MUST take precedence.

#### Scenario: Signed note follows the rename
- **WHEN** Alex publishes a signed note and then renames their profile to "Alexandre"
- **THEN** every participant sees "Alexandre" on that note

#### Scenario: Anonymous note unchanged
- **WHEN** Alex publishes an anonymous note and then renames their profile
- **THEN** the note stays anonymous for everyone

#### Scenario: Facilitator rename wins
- **WHEN** a facilitator renamed Alex to "Al" and Alex then renames their profile
- **THEN** the notes still show "Al"

### Requirement: Name shown by default
When a participant enters a display name, the system SHALL show that name on the notes they publish unless they choose to stay anonymous. A choice already saved in the profile MUST be kept.

#### Scenario: First name entered
- **WHEN** Alice enters "Alice" in the name dialog without touching the other options and publishes a note
- **THEN** every participant sees "Alice" on the note

#### Scenario: Stay anonymous
- **WHEN** Alice enters her name and unticks "Show my name on my notes"
- **THEN** her name appears in the participants list and her notes stay anonymous

#### Scenario: Saved anonymous choice
- **WHEN** a participant had saved "do not show my name" before this change
- **THEN** their notes stay anonymous until they change it

### Requirement: Name nudge
A participant without a name SHALL be invited once per board, by a dismissible floating popup, to choose a name.

#### Scenario: Join without a name
- **WHEN** Bob joins a board with no name and keeps the default "show my name" option
- **THEN** after a few seconds a floating popup suggests choosing a name, and "Choose a name" opens the name dialog

#### Scenario: Not now
- **WHEN** Bob clicks "Not now"
- **THEN** the popup does not come back on this board

#### Scenario: Don't ask again
- **WHEN** Bob clicks "Don't ask again"
- **THEN** no board in this browser shows the popup again

#### Scenario: Already has a name
- **WHEN** a participant has a name, whether or not their notes show it
- **THEN** the popup is never shown

### Requirement: Erase button styling
The Erase button of the profile dialog SHALL render completely inside its box, including its focus ring, using the shared button tokens.

#### Scenario: Focus ring not clipped
- **WHEN** the Erase button receives focus
- **THEN** its outline is fully visible

### Requirement: Peers shown with their own colour
Each client SHALL broadcast its profile (name, colour, avatar) when it connects and when it changes, and the participants menu SHALL show each person with that colour and avatar.

#### Scenario: Two people with chosen colours
- **WHEN** Alice picks a green avatar colour and Bob joins
- **THEN** Bob's participants menu shows Alice in green, not in a colour derived from her key

### Requirement: Layout per screen class
The board SHALL remember layout choices per screen class on the device (phone, tablet, desktop, wall) and apply the profile of the current class on every board.

#### Scenario: Laptop and TV
- **WHEN** Alice widens a column on her laptop and later opens a board on the meeting-room TV in the same browser profile
- **THEN** the TV keeps its own layout and the laptop finds the wide column again

### Requirement: Reset and copy layouts
The profile SHALL let the person reset the layout of the current screen class or copy another class's layout to it.

#### Scenario: Reset
- **WHEN** Alice resets the layout on this screen
- **THEN** every remembered size for this screen class returns to its default
