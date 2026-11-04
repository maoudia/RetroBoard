## ADDED Requirements

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
