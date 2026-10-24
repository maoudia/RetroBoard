# Tasks

## 1. Avatars

- [ ] 1.1 Select and bundle a persona avatar set with a license compatible with AGPL-3.0 distribution (record license in THIRD_PARTY_NOTICES); verify license check job passes
- [ ] 1.2 Default avatar logic (persona without name, initials with name) everywhere, including landing; verify e2e no "?" on any page
- [ ] 1.3 Avatar picker in profile and avatar id in presence; verify e2e two contexts
- [ ] 1.4 Gravatar opt-in with hashed email and conditional CSP `img-src`; verify e2e that no Gravatar request happens when off

## 2. Team space

- [ ] 2.1 `TeamProfile` model and IndexedDB adapter; verify unit tests
- [ ] 2.2 Team management UI in profile (create, rename, sprint counter, defaults) fr/en; verify e2e
- [ ] 2.3 Encrypted team file export/import; verify e2e round trip
