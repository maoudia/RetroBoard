## ADDED Requirements

### Requirement: Passcode by default
The creation form SHALL propose a generated passcode by default, placed right under the board title in simple and advanced modes, and the person SHALL be able to regenerate it or type their own.

#### Scenario: New board
- **WHEN** Alice opens the creation form
- **THEN** a readable passcode is already filled in under the title and she can regenerate, reveal, copy or replace it

### Requirement: Passcode generator
In advanced mode the creation form SHALL offer a generator with length, character classes, look-alike exclusion and a passphrase mode, and SHALL show the estimated strength in bits.

#### Scenario: Long passphrase
- **WHEN** Alice picks a passphrase of 6 English words separated by dashes
- **THEN** the field holds 6 words joined by dashes and the meter shows more than 60 bits

### Requirement: No passcode is an informed choice
Creating a board without a passcode SHALL require an explicit confirmation that states the risks, and the board content SHALL remain end-to-end encrypted with the link key.

#### Scenario: Opt out
- **WHEN** Alice clears the passcode and creates the board
- **THEN** a confirmation explains that anyone holding the link can read and write the board, and the board is created only if she confirms

### Requirement: Remembered passcode
A passcode entered or created on a device SHALL be remembered with the local copy of the board, so the board reopens on that device without asking again until the copy expires or is forgotten.

#### Scenario: Reopen
- **WHEN** Bob joined with the passcode yesterday and reopens the link on the same browser
- **THEN** the board opens without the passcode prompt
