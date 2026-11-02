# Proposal

## Why

Owner feedback (2026-11-02): RetroBoard is built in the open, so users need a clear call to action to report issues, suggest features and talk with the community, and links to the owner's social profiles (the "Find me on" list of https://www.maoudia.com/).

## What Changes

- A "Feedback" entry in the help menu, the board menu and the footer, and a short "Built in the open" section on the landing page.
- Three actions: report a bug (GitHub issue form), suggest a feature (GitHub Discussions, Ideas), ask or chat (GitHub Discussions, Q&A).
- Bug reports prefilled with the app version, browser and screen class only; never board content, room id or keys.
- "Follow the build" links, chosen from the maoudia.com list for a developer product: GitHub (https://github.com/aoudiamoncef and the repository), LinkedIn (https://www.linkedin.com/in/moncef-aoudia-7723b311b), X (https://twitter.com/aoudiamoncef), DEV.to (https://dev.to/aoudiamoncef). Discord (https://discordapp.com/users/365160200900182026) is a personal profile, not a community server: listed only if the owner wants it.
- Plain links only: no embeds, widgets, trackers or new origins (CSP unchanged).
- Issue forms (bug, feature) under `.github/ISSUE_TEMPLATE` and GitHub Discussions categories; enabling Discussions is a repository setting the owner turns on.

Out of scope: an in-app chat, analytics.

Bounded contexts: none (static links).

## Capabilities

### New Capabilities

- `community`

### Modified Capabilities

None.

## Impact

- Web: help menu, footer, landing; i18n fr/en.
- Repository: issue forms and Discussions categories (owner setting).
