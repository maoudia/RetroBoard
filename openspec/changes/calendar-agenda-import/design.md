# Design

## Decisions

- **Parser**: hand-written, small, pure (`parseIcs(text) -> MeetingInfo | error`), RFC 5545 line unfolding and escaping, only the properties listed in the proposal. No dependency: available libraries are large (ical.js is MPL-2.0 and about 50 kB) for what we need; to be re-evaluated if recurrence rules beyond FREQ/INTERVAL are required.
- **Time zones**: DTSTART with TZID is interpreted with `Intl.DateTimeFormat` for the named zone (no tz database bundled); floating times are local.
- **Pasted text**: heuristics for the formats of Google Calendar and Outlook invitations in fr and en (title line, "date, start - end", time zone); every extracted field is shown for confirmation before use.
- **Agenda scaling**: the existing presets are scaled to the meeting length with `scalePhases(phases, totalMs)` keeping minimum phase lengths (PHASE_FLOOR_MS).
- **Privacy**: the file never leaves the browser; attendee emails are counted, never stored or displayed.

Where things live: parser and scaling in `packages/application` (pure); UI in `apps/web`.

Security and privacy note: nothing reaches the relay; the parser treats the file as untrusted text (size cap 256 kB, no HTML rendering of descriptions).
