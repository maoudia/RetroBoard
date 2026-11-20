## ADDED Requirements

### Requirement: Sync shield button
The toolbar SHALL show a sync button at its start, next to the board's encryption badge, to every person whether or not sync is set up. It SHALL use a shield icon whose shape differs for every sync state, SHALL name the state in words in its accessible name and tooltip, and SHALL have a touch target of at least 44 px.

#### Scenario: Not set up
- **WHEN** a person who never set up sync looks at the toolbar
- **THEN** they see the muted shield and pressing it opens the onboarding

#### Scenario: Not the board's encryption badge
- **WHEN** both shields are in the toolbar
- **THEN** they differ in shape and in name, and a screen reader announces them as the board's encryption and the sync state

#### Scenario: Phone
- **WHEN** the toolbar scrolls or hides on a phone
- **THEN** the shield stays among the items that remain reachable

### Requirement: Pressing the shield syncs now
Pressing the shield SHALL sync now when sync is connected and unlocked, SHALL open the unlock prompt when locked, SHALL do the single recovery action when the state has one, and SHALL open the onboarding when sync is not set up. The settings SHALL stay reachable from the confirmation message and from the button's context menu, and the context menu SHALL never be the only path.

#### Scenario: Press to sync
- **WHEN** a person with an unlocked, connected vault presses the shield
- **THEN** a sync starts and a polite message "Synced 12:03" with a link to the settings follows

#### Scenario: Locked
- **WHEN** the vault is locked and the person presses the shield
- **THEN** the unlock prompt opens

### Requirement: Sync works in any folder
The folder path SHALL make no assumption about which service carries the folder: it SHALL write only its own `RetroBoard` folder inside the folder the person picks, SHALL show no provider-specific text, and SHALL leave carrying the folder to the person. A directory the browser refuses SHALL be explained with a suggested subfolder.

#### Scenario: A refused directory
- **WHEN** the picker refuses the folder the person chose
- **THEN** a message explains that the browser does not allow it and proposes making a subfolder

#### Scenario: Any carrier
- **WHEN** the chosen folder is carried by any file sync client or by none
- **THEN** the app behaves the same and names no provider

### Requirement: The vault can move
A person SHALL be able to choose another folder later, and the vault SHALL be identified by its vault id so that the same vault continues from the new place. Two different vaults SHALL never be merged silently.

#### Scenario: Move the vault
- **WHEN** a person moves the vault folder with their own tools and chooses it again
- **THEN** sync continues with the same vault and nothing is duplicated

#### Scenario: A folder with another vault
- **WHEN** the person picks a folder that holds a different vault
- **THEN** they are asked to use that vault or to create a new one there, and nothing is merged

### Requirement: Onboarding without an account
A sheet SHALL explain in plain words, before any choice, that sync needs no account, that the copy is encrypted and that the person chooses where it lives. It SHALL then offer only the ways this device can really do, detected by feature and never by user agent, with the best one first, and a short answer to why there is no cloud account.

#### Scenario: A phone
- **WHEN** a person opens the sheet on a browser with no folder picker
- **THEN** the folder path is not shown and the ways that work on a phone are

#### Scenario: Desktop Chromium
- **WHEN** a person opens the sheet on desktop Chromium
- **THEN** "A folder on this computer" comes first

### Requirement: A quiet nudge
A single dismissible, once-only nudge SHALL appear after the person's first board is created. It SHALL NOT appear as a dialog or during a running phase.

#### Scenario: The nudge
- **WHEN** a person creates their first board
- **THEN** a dismissible line offers to keep boards on other devices, and once dismissed it does not return on that device

#### Scenario: Never during a retro
- **WHEN** a phase is running
- **THEN** the nudge is not shown

### Requirement: Pairing without a platform
Two devices SHALL be able to pair through a short secret shown as a QR code and as words, using a password-authenticated key exchange so that neither the relay nor an observer can learn the key or guess the secret offline. The secret SHALL expire after two minutes and allow one attempt.

#### Scenario: Pair two devices
- **WHEN** the second device scans the QR code or types the words within two minutes
- **THEN** it receives the vault key and the library appears after the segments arrive

#### Scenario: Wrong or late secret
- **WHEN** a wrong secret is entered, or the secret is used after two minutes
- **THEN** pairing fails, nothing is revealed and a new secret is needed

### Requirement: Pairing moves keys, not credentials
The exchange SHALL move the vault key and a target description and SHALL NOT move provider credentials. Devices MAY exchange the missing sealed segments directly while both are open on the pairing screen. The relay SHALL remain memory-only and see only ciphertext, sizes and timing.

#### Scenario: No credentials move
- **WHEN** the first device is connected to a cloud provider
- **THEN** the second device is told which provider and signs in itself, and no token is transferred

#### Scenario: A recording relay
- **WHEN** a relay records every frame of a pairing
- **THEN** nothing it recorded lets it learn the vault key

### Requirement: Phone behaviour
Sync on a phone SHALL work only while the app is open, and SHALL say so. The sign-in state of a provider SHALL survive leaving and returning to the app. "Stay unlocked on this device" SHALL be an explicit opt-in that can be turned off.

#### Scenario: Return from the sign-in page
- **WHEN** a person is sent to sign in and returns to the installed app
- **THEN** the sign-in completes, or a clear message explains that the state was lost and how to retry

#### Scenario: Stay unlocked
- **WHEN** a person turns on "Stay unlocked on this device" and reloads
- **THEN** the vault stays unlocked until they turn it off
