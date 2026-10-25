# Tasks

## 1. Parsing

- [ ] 1.1 `parseIcs` (unfolding, escaping, VEVENT, DTSTART/DTEND/DURATION with TZID, SUMMARY, ORGANIZER CN, ATTENDEE count, RRULE FREQ/INTERVAL) with fixtures exported from Google Calendar, Outlook and Apple Calendar; verify unit tests and mutation score >= 80%
- [ ] 1.2 Pasted-invitation heuristics (fr/en Google and Outlook formats) returning fields with a confidence; verify unit tests with real anonymised samples
- [ ] 1.3 `scalePhases` to a meeting duration with phase floors; verify unit tests

## 2. Product

- [ ] 2.1 Drop zone and paste area on the creation page and in the agenda editor, confirmation of every field (fr/en); verify e2e and that no request carries the file
- [ ] 2.2 Start reminder ("starts in 5 minutes") and sprint number from recurrence with the team profile; verify unit test and e2e with a mocked clock
