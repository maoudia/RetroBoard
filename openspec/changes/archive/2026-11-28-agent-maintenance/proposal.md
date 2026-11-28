# Proposal

## Why

Split from `agentic-delivery-harness` (task 5.4, 2026-11-11). The implement, review and mention agents exist; the two scheduled maintenance agents do not (no `agent-triage` or `agent-docs` workflow), and adding them needs a maintainer-approved workflow change. Keeping the task there held the change open.

## What Changes

- Nightly `agent-triage`: reads the open issues and pull requests and opens one summary issue.
- Weekly `agent-docs`: checks the docs and the user guide against the code and opens one summary issue.
- Both run in automation mode with read-only tools plus issue creation, and skip themselves without the agent secrets, like the other agent workflows.

Out of scope: auto-fixing, auto-merging, any write to the repository other than issues.

## Capabilities

### New Capabilities

None. Tooling only, `skip_specs: true`.

### Modified Capabilities

None.

## Impact

- `.github/workflows/*` (protected by CODEOWNERS; needs an explicit maintainer request).
- Secrets: `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY`, as for `agent-implement`.
