# Proposal

## Why

Retros are scheduled in calendars. The facilitator retypes the title, the team, the time slot and the duration. Reading the calendar invitation would fill all of it and size the agenda to the real meeting length.

## What Changes

- On the creation page and in the agenda editor: "From a calendar invitation". The facilitator drops an `.ics` file (exported from Google Calendar, Outlook or Apple Calendar) or pastes the invitation text.
- A local parser (no calendar API, no account, no network) extracts title, start, end, time zone, recurrence, organiser display name and attendee count.
- The agenda preset is scaled to the meeting duration (for example 45 minutes), the title becomes the board title, attendees give a participant estimate, the start time arms a "starts in 5 minutes" reminder.
- Recurring retros: the sprint number is derived from the recurrence (every 2 weeks) for the smart title.

Out of scope: reading calendars through Google or Microsoft APIs (needs OAuth and a server), writing to calendars.

Bounded contexts: Facilitation (agenda), Team space (sprint counter). No relay traffic.

## Capabilities

### New Capabilities

- `calendar-import`: parsing calendar invitations into board settings and an agenda.

### Modified Capabilities

- `retro-agenda`: agenda sized from an imported meeting.

## Impact

- New pure parser in `packages/application` (iCalendar RFC 5545 subset: VEVENT, DTSTART/DTEND with TZID, DURATION, RRULE FREQ/INTERVAL, SUMMARY, ORGANIZER CN, ATTENDEE count) and a text heuristic for pasted invitations (fr/en date formats).
- Web: drop zone and paste area in creation and agenda editor.
