# Tasks

## 1. Avatars

- [ ] 1.1 Select and bundle a persona avatar set with a license compatible with AGPL-3.0 distribution (record license in THIRD_PARTY_NOTICES); verify license check job passes
- [ ] 1.2 Default avatar logic (persona without name, initials with name) everywhere, including landing; verify e2e no "?" on any page
- [ ] 1.3 Avatar picker in profile and avatar id in presence; verify e2e two contexts
- [ ] 1.4 Gravatar opt-in with hashed email and conditional CSP `img-src`; verify e2e that no Gravatar request happens when off

## 2. Team space

- [x] 2.1 (moved to `team-workspaces`, 2026-11-02) `TeamProfile` model and IndexedDB adapter; verify unit tests
- [x] 2.2 (moved to `team-workspaces`, 2026-11-02) Team management UI in profile (create, rename, sprint counter, defaults) fr/en; verify e2e
- [x] 2.3 (moved to `team-workspaces`, 2026-11-02) Encrypted team file export/import; verify e2e round trip

## 3. Profile page v2 (owner feedback 2026-10-25)

- [ ] 3.1 Recent boards first in the profile dialog (open, forget, last opened), then identity and settings; verify e2e
- [ ] 3.2 Identity block: avatar (persona icon, initials or Gravatar) with the name, a colour picker kept as the avatar background; verify e2e and axe
- [ ] 3.3 Display options "how others see me": icon and name, name only, icon only, anonymous, with a live preview and readable name colours; verify e2e two contexts
