## Purpose

Adds a time-box assistant and an optional playful AI companion that run only on participants' devices, never on a remote AI service.

## ADDED Requirements

### Requirement: Facilitator bot
The system SHALL provide, without any AI model, reminders before a phase ends, an overtime nudge, a wrap-up checklist and a generated report when the retro closes.

#### Scenario: One minute left
- **WHEN** one minute remains in the current phase
- **THEN** the facilitator sees a reminder and participants see a discreet countdown highlight

### Requirement: Local providers only
The system SHALL use only on-device or localhost AI providers chosen by the participant and MUST NOT send board content to remote AI services.

#### Scenario: No provider
- **WHEN** no local provider is available
- **THEN** AI features are hidden and every other feature works

### Requirement: Companion persona
The system SHALL offer an opt-in companion that posts short, friendly messages on phase changes and milestones, visible only to the participant who enabled it unless the facilitator shares it with the room.

#### Scenario: Muted companion
- **WHEN** a participant disables the companion
- **THEN** no companion message is shown to them

### Requirement: AI helpers
When a local provider is enabled, the system SHALL offer cluster title suggestions, duplicate detection, SMART phrasing for actions and a narrative summary for the report, each as a suggestion the person accepts or edits.

#### Scenario: SMART action
- **WHEN** a participant asks to improve "fix tests"
- **THEN** a suggested rewording with an owner, a measurable result and a due date is shown and nothing changes until accepted
