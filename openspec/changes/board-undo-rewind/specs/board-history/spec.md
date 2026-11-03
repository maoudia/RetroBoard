# board-history Specification

## Purpose
Undo, redo and rewind of board actions through compensating events in the append-only ledger.

## ADDED Requirements

### Requirement: Undo my last action
A participant SHALL be able to undo her latest reversible action, and every peer SHALL converge to the same resulting state.

#### Scenario: Wrong grouping
- **WHEN** Alice groups two notes by mistake and presses undo
- **THEN** the notes are separated again on every peer

### Requirement: Rewind by a facilitator
A facilitator SHALL be able to restore a previous state from the history panel, recorded as a new event.

#### Scenario: Restore
- **WHEN** a facilitator restores the state before a bad grouping
- **THEN** the board shows that state and the history shows the restore action
