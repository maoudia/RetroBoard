# storage-vault Specification

## Purpose
The encrypted object format, keys, layout, merge and failure behaviour of a vault on any file target.

## ADDED Requirements

### Requirement: Target interface
The application SHALL talk to every target through one port with list by prefix, get, put with an optional `ifMatch` (an etag or "absent"), delete and stat, and a declaration of what the target guarantees. Every adapter SHALL pass one shared contract suite, and an in-memory fake SHALL run it without a network.

#### Scenario: Contract suite
- **WHEN** an adapter is added
- **THEN** it is accepted only if it passes the contract suite, including create-only puts, stale etags, paging past one provider page, idempotent delete and error mapping

#### Scenario: Bytes only
- **WHEN** a network adapter handles an object
- **THEN** it receives sealed bytes and never a key or plaintext

### Requirement: All synced data is encrypted client-side before any write
Every datum the application synchronises, including board events, titles, notes, names, team names, settings and the library, SHALL be encrypted in the browser before it is handed to any target adapter, and nothing readable SHALL be written to a target, in an object, a file name or a path. There SHALL be no unencrypted mode. This SHALL be tested by asserting that the in-memory fake target never receives plaintext of titles, notes, settings or names.

#### Scenario: Canary test on the fake target
- **WHEN** a board, a library, settings, a workspace and an identity containing distinctive strings are synced to the fake target
- **THEN** none of those strings, in UTF-8, UTF-16, base64 or percent-encoded form, occurs in any path or stored byte, `info.json` included

#### Scenario: Real folder
- **WHEN** the same data is synced to a real folder in the end-to-end test
- **THEN** reading every file of the folder finds none of the strings

#### Scenario: info.json holds no user data
- **WHEN** `info.json` is read
- **THEN** it contains only the format version, ids, key ids, wrapped keys with KDF parameters and update times

### Requirement: Sealed objects
Every object written to a target, except `info.json`, SHALL be encrypted and authenticated with AES-GCM in chunks, under a per-object key derived from the vault key, with a plaintext header holding only the format version, the cipher, the key id, a random salt and the chunk size. A truncated, reordered or swapped object SHALL be rejected.

#### Scenario: Truncation detected
- **WHEN** an object is cut after a chunk
- **THEN** opening it fails and the object is ignored until a complete copy appears

#### Scenario: Object bound to its place
- **WHEN** a segment of one board is copied to another board's stream
- **THEN** opening it fails

#### Scenario: Sizes padded
- **WHEN** a small object is written
- **THEN** its stored size is a power of two of at least 1 KiB

### Requirement: Keys and password
A vault SHALL have a random 256-bit master key, stored only wrapped: once by a key derived from the user's password with a memory-hard function (Argon2id, parameters stored with the wrap and never below the documented floor) and once by a recovery key. A password change SHALL re-wrap the master key only and SHALL NOT re-encrypt any object. A password SHALL have at least 12 characters.

#### Scenario: Password change
- **WHEN** a user changes the password
- **THEN** only `info.json` changes and other unlocked devices keep working

#### Scenario: Recovery key
- **WHEN** a user forgets the password and has the recovery key
- **THEN** they unlock the vault and set a new password

#### Scenario: Key loss
- **WHEN** the password and the recovery key are both lost
- **THEN** the content of the target is unrecoverable, and the application said so when the vault was created

### Requirement: Existing share links keep working
Joining a board by link and the relay protocol SHALL be unchanged. A board's events SHALL be stored in the vault as the existing encrypted envelopes, wrapped by the vault key, and the board's keys SHALL be stored only inside the sealed library entry.

#### Scenario: Link and vault
- **WHEN** a board is in a vault
- **THEN** the same share link still opens it for a participant who has no vault

### Requirement: Immutable layout and merge
Boards SHALL be written as immutable segment files named by device, sequence and a random suffix, with one manifest per device written only by that device, so that merging two copies is a union by event id and no lock file is needed. Preferences SHALL merge last-write-wins per setting by hybrid timestamp then device id, and `info.json` SHALL merge per property by its update time.

#### Scenario: Two devices offline
- **WHEN** two devices edit the same board offline and then sync
- **THEN** both devices hold the union of the events in the same order

#### Scenario: Setting conflict
- **WHEN** two devices change the same setting offline
- **THEN** the later change wins on both, a tie going to the higher device id

#### Scenario: Compaction does not race
- **WHEN** a device compacts its segments while another reads
- **THEN** the reader finds the checkpoint or re-lists, and no event is lost

### Requirement: Lazy board events
A device SHALL fetch the segments of a board only when the board is opened or flagged to be kept offline, and SHALL fetch the library and preferences on every sync.

#### Scenario: Large library
- **WHEN** a library holds 200 boards
- **THEN** connecting a new device downloads the library and preferences but no board stream

### Requirement: Failure behaviour
The application SHALL survive partial writes, a target that is full, a replaced or deleted vault, a rolled-back `info.json`, clock skew and concurrent tabs without losing local data and without silently overwriting a vault.

#### Scenario: Target full
- **WHEN** the target refuses a write for lack of space
- **THEN** sync pauses with a visible state, nothing is deleted and local edits continue

#### Scenario: Vault replaced
- **WHEN** the vault id on the target is not the one this device connected to
- **THEN** the user is asked what to do and the vault is not recreated automatically

#### Scenario: Rollback refused
- **WHEN** the target serves an older `info.json` than one already seen
- **THEN** the device ignores it and reports a warning

#### Scenario: Skewed clock
- **WHEN** a device with a clock one year ahead changes a setting
- **THEN** another device's later edit still wins over it

#### Scenario: Two tabs
- **WHEN** two tabs of the same vault are open
- **THEN** only one of them syncs at a time

### Requirement: What the target sees is documented
The documentation and the privacy page SHALL state what a target can observe: object count, padded sizes, timing, the number of devices and boards, key ids, KDF parameters and the account, and that it can delete or withhold objects but not read or alter them.

#### Scenario: Privacy page
- **WHEN** a user reads the privacy page
- **THEN** it lists those observations
