## ADDED Requirements

### Requirement: Sealed vault file
The system SHALL export the vault as one `.rbv` file made only of the same sealed objects a folder target would hold, and SHALL import such a file into the local copy by the normal union, so that nothing readable is ever written and no merge rule is added. The file SHALL be readable only with the vault password or the recovery key.

#### Scenario: Export and import on another device
- **WHEN** a person saves the vault file on one device and opens it on another with the password
- **THEN** the library and its boards appear on the second device

#### Scenario: Nothing readable
- **WHEN** a canary text is placed in a title, a note and a name before an export
- **THEN** it appears nowhere in the file bytes, in UTF-8, UTF-16, base64 or percent-encoded form

#### Scenario: A damaged or truncated file
- **WHEN** a file is truncated, reordered or belongs to another vault
- **THEN** the import is refused with a clear message and the local copy is unchanged

### Requirement: One backup file format
Export SHALL use the system share sheet when it can share files and a download otherwise. The `.rbv` file SHALL be the single format used by every backup or board-file feature, and the settings SHALL show the age of the last saved file as a hint, never as an error.

#### Scenario: Share sheet
- **WHEN** the device can share files
- **THEN** saving the vault opens the share sheet with the file

#### Scenario: Last backup
- **WHEN** a file has been saved
- **THEN** the settings show the age of the last file, as a hint and never as an error
