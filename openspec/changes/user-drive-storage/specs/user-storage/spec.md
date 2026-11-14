# user-storage Specification

## Purpose
Opt-in, encrypted keeping of a user's boards and preferences in storage the user owns, and a library that follows the user across devices.

## ADDED Requirements

### Requirement: Opt-in encrypted persistence
When the user connects a storage target, the application SHALL write their boards, board library and preferences to it only as encrypted objects, and SHALL NOT send them to any server of ours or to any other third party. Without a connected target the application SHALL behave as before, keeping data in the browser.

#### Scenario: Nothing leaves without consent
- **WHEN** a user has never connected a target
- **THEN** the application makes no request to any storage provider and loads no provider script

#### Scenario: Only ciphertext is written
- **WHEN** a user edits a board while a target is connected
- **THEN** every file written to the target is an encrypted object whose name reveals neither the board id nor its title

### Requirement: Preferences > Sync
The preferences SHALL have a Sync section where the user chooses a folder with the directory picker and the application then syncs boards, preferences and the rest of the user's own data there automatically, as encrypted files, with debounced writes and a pull on open, on focus, on a timer and on demand. Whatever sync client the user runs on the folder carries the files onward, and the application SHALL NOT need a sign-in, an account of ours or any third-party origin for it.

#### Scenario: Pick a folder
- **WHEN** a user chooses a folder in Preferences > Sync and creates a vault password
- **THEN** encrypted files appear in a `RetroBoard` subfolder of it and later edits of boards and preferences are written there without a further action

#### Scenario: Browser without the folder API
- **WHEN** the browser has no directory picker (Safari, Firefox, iOS and Android browsers)
- **THEN** the Sync section says that folders need a desktop Chromium browser and that other ways are coming, and the application keeps its data in the browser as before

### Requirement: Password and recovery key before the first sync
Sync SHALL NOT start until the user has set a vault password and has been shown a recovery key, and has acknowledged that if both are lost the synced data is unreadable and cannot be recovered by anyone. There SHALL be no way to sync without a password and no setting that turns encryption off.

#### Scenario: Acknowledgement
- **WHEN** a user creates a vault
- **THEN** the first sync starts only after they tick that they stored the recovery key and that they understand a lost password and recovery key mean unreadable data

#### Scenario: No switch
- **WHEN** a user looks through the sync settings
- **THEN** there is no option to sync without encryption or without a password

### Requirement: Sign in without registering
For a cloud provider that needs a sign-in (OneDrive from its group), a user SHALL connect by signing in with their own account and SHALL NOT have to register an application, create a key or paste a secret. The application registration SHALL be a one-time step of the maintainer, and its public client id SHALL be configuration of the site.

#### Scenario: Sign in with Microsoft
- **WHEN** a user presses "Sign in with Microsoft" and signs in with an Outlook, Hotmail, or (where supported) work account
- **THEN** the application syncs files in its own OneDrive app folder and asks nothing else of the user except the vault password

#### Scenario: Provider not configured
- **WHEN** the site has no client id for a provider (for example a self-hosted copy)
- **THEN** the application does not offer that provider

### Requirement: Board library
The application SHALL keep an encrypted library of the boards the user created and the boards they chose to save after joining by link. An entry SHALL hold the board id, title, team reference, role, origin, last activity, a sealed key reference to reopen the board, and its archived state. The library SHALL exist before any target is connected, in the browser, and SHALL be kept in the target once one is connected.

#### Scenario: Created boards are listed
- **WHEN** a user creates a board
- **THEN** it appears in their library with its title and last activity

#### Scenario: Joined boards are opt-in
- **WHEN** a user joins a board by link and has not saved it
- **THEN** the board is not in the library, and a "Save to my library" action adds it

#### Scenario: Open, archive, forget
- **WHEN** a user opens, archives or forgets a library entry
- **THEN** opening reopens the board with its keys, archiving hides it from the main list and keeps its data, and forgetting removes the entry and, after confirmation, its mirrored events from the target and this browser, without affecting other participants

#### Scenario: Passcode boards
- **WHEN** a library board has a passcode
- **THEN** the passcode is not stored and the user is asked for it when reopening

### Requirement: Change of device
A user with a new device SHALL see their library after choosing the same target and entering the vault password, the recovery key, or scanning a pairing code, and SHALL be able to open any listed board, with its events fetched when it is opened.

#### Scenario: New device
- **WHEN** a user chooses the same folder (carried there by their sync client) on a second computer and enters the password
- **THEN** the library and the preferences appear within one sync and no board events are downloaded until a board is opened

#### Scenario: Board history restored
- **WHEN** the user opens a library board on the new device
- **THEN** its events are restored from the target and the board continues on the normal live path

#### Scenario: Merge with local boards
- **WHEN** the new device already has local boards and preferences
- **THEN** the libraries are united and each preference takes its newest value

### Requirement: Status and control
The application SHALL show the state of the connection (synced with time, syncing, offline, locked, allow folder access, folder not found, waiting for a file from the sync client, sign in again, target full, needs attention with a reason), SHALL offer "Sync now", and SHALL keep working on the local copy whatever the state.

#### Scenario: Folder access to grant again
- **WHEN** the browser asks again for permission on the folder
- **THEN** the status says "Allow folder access" with a button, local editing continues, and one click restores sync

#### Scenario: Accessible status
- **WHEN** the status changes
- **THEN** it is announced politely to assistive technology and the dialog has no axe violation

### Requirement: Disconnect and forget
The user SHALL be able to disconnect the storage, which stops sync and removes the tokens, credentials, directory handle, vault key and cached target settings from the browser. The user SHALL be able to also delete their vault from the target, after entering the password.

#### Scenario: Disconnect
- **WHEN** a user disconnects
- **THEN** the application stops writing, keeps no access to the target and keeps the local boards

#### Scenario: Revocation is explained
- **WHEN** a provider offers no revocation call for the application
- **THEN** the dialog links to the provider's page where the user removes the application's access, and says what stays valid until then
