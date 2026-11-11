## MODIFIED Requirements

### Requirement: Join by code
A participant SHALL be able to join a live board from the landing page with a short code approved by a facilitator, and neither the relay nor a person who knows the code SHALL be able to obtain the board key by imitating the joiner.

#### Scenario: Knock
- **WHEN** Bob enters the code shown on the shared screen and Alice approves
- **THEN** Bob opens the board and the relay only saw the code, the room id and ciphertext

#### Scenario: Imitated knock
- **WHEN** a second request arrives with the name and safety number of a pending request
- **THEN** both are refused and Alice is told that someone tried to imitate a participant

#### Scenario: Number chosen after the fact
- **WHEN** a party who read Bob's request tries to produce a request with the same safety number
- **THEN** the number of its request differs, because it depends on a value the holder chose after the request was committed
