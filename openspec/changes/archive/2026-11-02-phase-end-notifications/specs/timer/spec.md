## ADDED Requirements

### Requirement: End-of-time popup
When a phase timer or the shared countdown reaches zero, every participant SHALL see a popup announcing it with the next phase; people who can drive the agenda SHALL get "Next phase" and "+2 min".

#### Scenario: Write ends
- **WHEN** the Write phase timer reaches zero
- **THEN** everyone sees "Time is up for Write - Next: Group", and a facilitator can press "Next phase"

#### Scenario: Typing
- **WHEN** a participant is typing a note when the timer ends
- **THEN** the popup appears without taking the focus from the composer

#### Scenario: Reconnect
- **WHEN** a participant reconnects after the timer ended
- **THEN** the popup is not shown a second time for the same timer

### Requirement: Warning and system notification
A "1 minute left" toast SHALL appear before the end unless turned off, and a person who enabled system notifications SHALL get one when the tab is hidden, without any push service.

#### Scenario: Hidden tab
- **WHEN** Bob enabled system notifications and the timer ends while his tab is in the background
- **THEN** his browser shows a system notification "Time is up for Write"
