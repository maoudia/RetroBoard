## ADDED Requirements

### Requirement: Join by code
A participant SHALL be able to join a live board from the landing page with a short code approved by a facilitator, without the relay ever receiving the board key.

#### Scenario: Knock
- **WHEN** Bob enters the code shown on the shared screen and Alice approves
- **THEN** Bob opens the board and the relay only saw the code, the room id and ciphertext
