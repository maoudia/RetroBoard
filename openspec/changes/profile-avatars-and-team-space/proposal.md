# Proposal

## Why

The profile shows a "?" bubble on the landing page, which feels broken. People want friendly avatars (persona sets like Jira, optionally Gravatar). Facilitators need a local team space (team name, sprint counter, agenda defaults, action history) for smart titles and carry-over.

## What Changes

- Friendly default avatar: initials or a generated persona, never "?".
- Bundled, self-hosted persona avatar sets (license compatible), colour choice, optional emoji.
- Gravatar as an explicit opt-in (email hashed in the browser; CSP opened for Gravatar only when on).
- Local team space: teams list, current team, sprint counter, default agenda, default vote policy, action history; export/import as a file to share with another facilitator.

Out of scope: accounts, cloud sync of profiles.

## Capabilities

### New Capabilities

- `team-space`: local, per-device team profiles used to prepare retros.

### Modified Capabilities

- `profile`: avatar choices and Gravatar opt-in.

## Impact

- Contexts: Team space (local), Presence (avatar shown to others as a small descriptor, not an image upload).
