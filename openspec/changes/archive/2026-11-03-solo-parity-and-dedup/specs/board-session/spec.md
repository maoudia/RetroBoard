## ADDED Requirements

### Requirement: One engine for solo and shared boards
Solo boards SHALL run the same event ledger and features as shared boards, with nothing leaving the browser tab.

#### Scenario: Agenda in solo
- **WHEN** Alice tries solo and starts the agenda
- **THEN** the phases, rings and timers behave as on a shared board and no network request carries board data

### Requirement: Feature parity check
A parity test SHALL fail when a board feature is available on shared boards but missing on solo boards.

#### Scenario: New dialog
- **WHEN** a new board dialog is added for shared boards only
- **THEN** the parity test fails until the dialog also works in solo
