## ADDED Requirements

### Requirement: A poker room has a theme chosen by its moderator
A poker room SHALL have a theme that its moderator (the lead facilitator or a co-facilitator) chooses at creation or later, written into the room and applied to every participant, who SHALL choose only the light or dark variant for their own screen. The product pages SHALL keep the product design and SHALL NOT use the room's theme.

#### Scenario: One look for the team
- **WHEN** the moderator of a poker room picks the Noel theme and a participant whose device default is Studio joins
- **THEN** the participant sees the room in Noel, and can switch it only between its light and dark variants

#### Scenario: A participant cannot change it
- **WHEN** a participant without moderation rights opens the room's options
- **THEN** the theme picker is read-only and says that only the moderator can change it, and a theme change they send is ignored by every replica

#### Scenario: Leaving the room
- **WHEN** a person leaves the room for the landing page
- **THEN** the landing page uses the product design and the person's own default theme

#### Scenario: A room made before
- **WHEN** a room with no theme set is opened by two people whose devices use different themes
- **THEN** each sees their own device's theme, and the moderator's options offer to set the room's theme

#### Scenario: An older client
- **WHEN** a client that does not know the theme command is in the room
- **THEN** it keeps and forwards the event, shows its own device's theme and reads the same cards and votes as everybody

### Requirement: Every theme works in the room
In each of the nine themes and in every theme added later, in light and dark, a poker room SHALL meet the contrast and accessibility rules of the themes spec, and the ambient animation, the fonts, the timer rings and the card skins SHALL follow the room's theme under the same reduced-motion rules as a board.

#### Scenario: Contrast over the themes
- **WHEN** the contrast spec runs the room in each theme in light and dark in lobby, voting, waiting and revealed
- **THEN** no text is under 4.5:1 and no card or slot edge is under 3:1

#### Scenario: Ambient animation
- **WHEN** the room's theme has an ambient animation and the person prefers reduced motion
- **THEN** the room shows none
