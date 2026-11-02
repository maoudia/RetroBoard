# Tasks

## 1. Model

- [x] 1.1 ADR: local team identity, projects and sharing without server storage; verify `pnpm adr:check`
- [x] 1.2 Team and project model, board membership and the carry-over query by team in application, IndexedDB adapter in web; verify unit tests

## 2. Creation and actions

- [x] 2.1 Team and project at creation (simple prefills the last team; advanced shows both); verify e2e
- [x] 2.2 Carry-over picker by team and project with source board and date; verify e2e with two teams
- [ ] 2.3 Team series: smart title, default format, theme and agenda per team; verify unit and e2e

## 3. Home and sharing

- [ ] 3.1 (lanes on recent boards done; team switcher in the profile left) Team switcher and recent boards grouped by team on home and profile (fr/en); verify e2e and axe
- [ ] 3.2 Encrypted team link and `.retroteam` file (no board content); verify e2e two contexts and a test that the file holds no note text
