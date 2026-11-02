## ADDED Requirements

### Requirement: Join a board from the landing page
The landing page SHALL let a visitor paste a board link and open that board, and SHALL say when the pasted text is not a board link.

#### Scenario: Paste a link
- **WHEN** Bob pastes the link Alice sent him on the landing page and presses Join
- **THEN** the board opens for Bob

#### Scenario: Wrong text
- **WHEN** Bob pastes "hello"
- **THEN** an error says it is not a RetroBoard link and nothing opens
