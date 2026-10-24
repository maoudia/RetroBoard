# Tasks

## 1. Domain and application

- [x] 1.1 Extend `Action` with status workflow, history, due date, origin and carry-over metadata; verify unit tests for transitions
- [x] 1.2 Owner suggestion query (presence, history, custom last); verify unit tests

## 2. Carry-over

- [ ] 2.1 `ActionSourcePort` adapters: team profile, board file, JSON, CSV (Jira columns); verify unit tests with fixtures
- [ ] 2.2 Live previous board source (read-only join, then leave); verify e2e with two boards
- [x] 2.3 Import step in board creation with preview and selection; verify e2e

## 3. UI

- [x] 3.1 Owner combobox with suggestions and custom entry (accessible combobox pattern, fr/en); verify e2e and axe
- [x] 3.2 Status UI for both modes and the previous actions review popup/section; verify e2e
- [x] 3.3 "Save actions for next time" at close, writing to the team profile; verify e2e then a new board imports them
