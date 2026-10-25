## ADDED Requirements

### Requirement: Import a calendar invitation
The system SHALL read a calendar invitation (an .ics file or pasted invitation text) on the device and SHALL propose a board title, start time, duration and participant estimate for confirmation.

#### Scenario: Google Calendar export
- **WHEN** the facilitator drops the .ics of "Sprint 42 retro" from 14:00 to 14:45 with 8 attendees
- **THEN** the form proposes the title "Sprint 42 retro", a 45-minute agenda and about 8 participants

#### Scenario: Nothing leaves the device
- **WHEN** an invitation is imported
- **THEN** no network request carries any part of it and attendee addresses are not displayed

### Requirement: Recurring retros
The system SHALL derive the sprint number for the smart title from a weekly recurrence of an imported invitation when the team profile has a sprint counter.

#### Scenario: Every two weeks
- **WHEN** the invitation repeats every 2 weeks and the team's last sprint was 41
- **THEN** the proposed title uses sprint 42
