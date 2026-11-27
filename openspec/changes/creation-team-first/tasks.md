# Tasks

## 1. Team and project first

- [x] 1.1 Move the team card above the setup form on `/new`, add the compact simple-mode row (team select with "New team", optional project) and keep the advanced explanation; team defaults reach the form before it is touched and never replace a typed title or a picked format; verify unit test of the prefill timing and e2e in both modes (default team untouched, another team picked, new team created, project typed), axe, and phone to TV layouts
- [x] 1.2 The board set-up page and its invite step use the same order; carry-over stays below the form and reads the chosen team and project; fr and en keys; verify e2e of the carry-over after changing the team and the pseudo-locale overflow check
- [x] 1.3 Guide step "Choose your team first" (fr and en), manifest updated, `pnpm docs:tour && pnpm docs:guide`; verify `pnpm docs:check` and that the existing creation e2e specs are updated, not deleted
