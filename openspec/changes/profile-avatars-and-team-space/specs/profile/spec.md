## ADDED Requirements

### Requirement: Friendly default avatar
The system MUST never show a question mark as an avatar; without a name it SHALL show a generated persona avatar, and with a name it SHALL show initials on a colour.

#### Scenario: New visitor
- **WHEN** a first-time visitor opens the landing page
- **THEN** the profile button shows a persona avatar

### Requirement: Persona avatars
The system SHALL offer at least 24 bundled persona avatars served from the site, and SHALL share only the chosen avatar identifier with other participants.

#### Scenario: Choose a persona
- **WHEN** a participant picks persona 7
- **THEN** other participants see persona 7 next to their name and no image is uploaded

### Requirement: Gravatar opt-in
The system SHALL offer Gravatar only as an explicit opt-in that explains that a hash of the email is sent to Gravatar, and MUST NOT contact Gravatar otherwise.

#### Scenario: Gravatar off
- **WHEN** a participant has not enabled Gravatar
- **THEN** no request is made to Gravatar's domain

### Requirement: Recent boards first
The profile SHALL list the participant's recent boards at the top.

#### Scenario: Open the profile
- **WHEN** a participant with 3 recent boards opens the profile
- **THEN** the 3 boards are the first thing shown, most recent first

### Requirement: How others see me
The profile SHALL let a participant choose how they appear to others (icon and name, name only, icon only, anonymous), with a live preview.

#### Scenario: Icon only
- **WHEN** a participant chooses "icon only"
- **THEN** others see their avatar icon without a name
