## ADDED Requirements

### Requirement: The local copy survives use
The local encrypted copy of a board SHALL be kept for the chosen retention counted from the last time the board was opened or written, and the start-up cleanup SHALL NOT delete a board that this tab is opening.

#### Scenario: Reopened every day
- **WHEN** Alice opens a board every day and never writes in it, with a retention of 7 days
- **THEN** the board is still on her device after 30 days

### Requirement: The waiting screen asks again
While no connected participant holds the board, the page SHALL offer a "Try again" action and SHALL reconnect by itself at a regular interval.

#### Scenario: A holder arrives
- **WHEN** Bob opens the board while Alice sees the waiting screen
- **THEN** the board appears for Alice without any action, at the latest at the next retry
