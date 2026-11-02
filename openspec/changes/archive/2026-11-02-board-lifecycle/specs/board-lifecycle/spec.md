## ADDED Requirements

### Requirement: Destroy the board
The facilitator SHALL be able to destroy the board after confirming with its title; every participant's local copy SHALL then be deleted and the link SHALL show that the board was closed.

#### Scenario: After export
- **WHEN** the facilitator exports the report and then destroys the board
- **THEN** every connected participant leaves the board, their local copy is deleted and opening the link shows "closed by the facilitator"

#### Scenario: Offline participant
- **WHEN** a participant was offline during the destroy and opens the link later while another participant still has the event
- **THEN** their local copy is deleted when they sync

### Requirement: Partial resets
The facilitator SHALL be able to reset the whole board, one column, the votes, or the timer and agenda clock, each after a confirmation, and every participant SHALL be told what was reset.

#### Scenario: Reset one column
- **WHEN** the facilitator resets the "Stop" column
- **THEN** its notes and clusters are removed for everyone and the other columns are unchanged
