# Changelog

## [1.26.0](https://github.com/maoudia/RetroBoard/compare/v1.25.0...v1.26.0) (2026-11-02)


### Features

* **boards:** recent boards up front on the home page, the creation page and a switcher in the board toolbar ([20e4bb9](https://github.com/maoudia/RetroBoard/commit/20e4bb9f60fc8a9688cc09103dd167307b1e738a))
* **ui:** simple and advanced mode for creation, sharing and export ([252c855](https://github.com/maoudia/RetroBoard/commit/252c8554214f19443adf144edf7b38fc284ff0c0))


### Bug Fixes

* **board:** keep the local copy of boards in use, retry from the waiting screen, create button on the right ([bfbf48f](https://github.com/maoudia/RetroBoard/commit/bfbf48fc7ab1cf79f2590b552f829a27db12ba3f))

## [1.25.0](https://github.com/maoudia/RetroBoard/compare/v1.24.0...v1.25.0) (2026-11-01)


### Features

* **presence:** announce arrivals option with grouped popups, in creation and options ([a097554](https://github.com/maoudia/RetroBoard/commit/a0975541a2030569430ca09d5cd48af88bfd627b))
* **presence:** connection dot per participant in words, and my own state line ([6cd94e5](https://github.com/maoudia/RetroBoard/commit/6cd94e52487a1b8b0bc122476ef2b025293501ec))
* **presence:** joins and departures appear in the activity feed ([28b7789](https://github.com/maoudia/RetroBoard/commit/28b7789b5e9ebebaa44f28baee00030a50c7b52b))
* **voting:** vote only on chosen columns, with sensible defaults per format ([c76bdf1](https://github.com/maoudia/RetroBoard/commit/c76bdf1da247a8e5103b628b75f3ba30eb6014a2))


### Bug Fixes

* **web:** the creation page lists recent boards so going back never loses the way to yours ([#222](https://github.com/maoudia/RetroBoard/issues/222)) ([21c4dde](https://github.com/maoudia/RetroBoard/commit/21c4dde41dab9f4b722067500002f550b999d289))

## [1.24.0](https://github.com/maoudia/RetroBoard/compare/v1.23.0...v1.24.0) (2026-11-01)


### Features

* **clusters:** recolour a whole cluster from its panel with one command ([d58e3a2](https://github.com/maoudia/RetroBoard/commit/d58e3a2d2b5b22fc9f532effde9de373af4a420e))


### Bug Fixes

* **a11y:** sakura badge reaches 4.5:1, contrast checked on every theme and variant ([#225](https://github.com/maoudia/RetroBoard/issues/225)) ([01d3346](https://github.com/maoudia/RetroBoard/commit/01d334639f6cbd712235ea2311739ea4a7be8859))
* **keyboard:** digits and AltGr brackets work on AZERTY, handler kept without a library ([dd54d6d](https://github.com/maoudia/RetroBoard/commit/dd54d6da663550c378358faf925b9289e1bf99f4))

## [1.23.0](https://github.com/maoudia/RetroBoard/compare/v1.22.0...v1.23.0) (2026-11-01)


### Features

* **export:** reports and exports mark pinned and frozen ideas and hidden columns ([c96265e](https://github.com/maoudia/RetroBoard/commit/c96265ea706748535aff67191791986420f3266d))

## [1.22.0](https://github.com/maoudia/RetroBoard/compare/v1.21.1...v1.22.0) (2026-11-01)


### Features

* **agenda:** global time follows the real time spent, start button inside the ring, phase details on bar segments ([d1fd1f1](https://github.com/maoudia/RetroBoard/commit/d1fd1f1e8575cb3f04785326628e1745e8ed34c9))
* **notes:** facilitators pin a note or a cluster at the top of its column ([c58f08f](https://github.com/maoudia/RetroBoard/commit/c58f08f4e1ffe359e9b1c1ef0bfc7136fa5065c6))
* **toolbar:** tools slide horizontally on small screens instead of wrapping over the columns ([71676d9](https://github.com/maoudia/RetroBoard/commit/71676d9ce7c870a457f571f8e305890c1e778c88))
* **ui:** icon at the left of every labelled button, guarded by a design test ([91d14a7](https://github.com/maoudia/RetroBoard/commit/91d14a705f0195fb7032a20e60fbef410d4ab27a))


### Bug Fixes

* **a11y:** segment hit areas no longer overlap the phase bar mode button (target size) ([85b0c64](https://github.com/maoudia/RetroBoard/commit/85b0c64fdf5c2ad65e775903b374afaa9289b0c9))

## [1.21.1](https://github.com/maoudia/RetroBoard/compare/v1.21.0...v1.21.1) (2026-11-01)


### Bug Fixes

* **a11y:** live regions are visually hidden again, the phase history stays in the activity feed ([98c9d68](https://github.com/maoudia/RetroBoard/commit/98c9d684203070296268bbd65e7f6171b9852e07))

## [1.21.0](https://github.com/maoudia/RetroBoard/compare/v1.20.1...v1.21.0) (2026-11-01)


### Features

* **agenda:** choose time elapsed or time left for the phase bar and the global clock, overtime in red ([35e0c96](https://github.com/maoudia/RetroBoard/commit/35e0c96e3342ed2aef30e5b441dc773eb63ecfb8))
* **columns:** facilitator hides and shows columns for everyone, hidden-columns chip, presenter skips them ([19b5309](https://github.com/maoudia/RetroBoard/commit/19b5309e33cb3aed74434696905e569484dd0827))


### Bug Fixes

* **access:** the facilitator link makes the session key a co-facilitator so phase rules do not block its notes ([3ebe3d3](https://github.com/maoudia/RetroBoard/commit/3ebe3d3b10c5fd27ba17b6b8a109531410c66e73))
* **ui:** presenter QR close, in-card cluster vote, Copy icon, single voting switch, publish gated by phase ([aa16fc4](https://github.com/maoudia/RetroBoard/commit/aa16fc465a9b7ea5d146064ca1980ae9ba855f02))

## [1.20.1](https://github.com/maoudia/RetroBoard/compare/v1.20.0...v1.20.1) (2026-10-31)


### Refactoring

* **ui:** shared type and radius scales, design system guide and a guard test for new off-scale values ([e149092](https://github.com/maoudia/RetroBoard/commit/e149092a54eaa0cac354d869aeb08464715ef5cc))

## [1.20.0](https://github.com/maoudia/RetroBoard/compare/v1.19.0...v1.20.0) (2026-10-31)


### Features

* **voting:** group secret voting and reveal all in a facilitator More menu on the vote bar ([655c259](https://github.com/maoudia/RetroBoard/commit/655c25992724605e06be83f873d33b24de858cf4))

## [1.19.0](https://github.com/maoudia/RetroBoard/compare/v1.18.1...v1.19.0) (2026-10-31)


### Features

* **profile:** personal notification position (left, centre, right) for toasts and the time-up popup ([46e32ef](https://github.com/maoudia/RetroBoard/commit/46e32ef77b8a2b86f826aa6f0fb720e4fa35374d))

## [1.18.1](https://github.com/maoudia/RetroBoard/compare/v1.18.0...v1.18.1) (2026-10-31)


### Bug Fixes

* **board:** keep the time-up popup on screen with fixed positioning and hide it after 20 seconds ([d7e44c4](https://github.com/maoudia/RetroBoard/commit/d7e44c410723ef2ebdc74d5bc0577b36111e26b6))

## [1.18.0](https://github.com/maoudia/RetroBoard/compare/v1.17.0...v1.18.0) (2026-10-31)


### Features

* **board:** activity bell with unread badge listing phase, voting and reveal events ([90765a2](https://github.com/maoudia/RetroBoard/commit/90765a2c024e82ad5f9e81dbaf99f4339e8c44d8))

## [1.17.0](https://github.com/maoudia/RetroBoard/compare/v1.16.0...v1.17.0) (2026-10-31)


### Features

* **columns:** group similar ideas after a preview, with undo ([aaaea6f](https://github.com/maoudia/RetroBoard/commit/aaaea6f10ad0b0f6269238eef1afbf5bbc5ce289))

## [1.16.0](https://github.com/maoudia/RetroBoard/compare/v1.15.0...v1.16.0) (2026-10-31)


### Features

* **columns:** group a column by author after a preview, with undo ([787a221](https://github.com/maoudia/RetroBoard/commit/787a221a5eccd443e34f6e5c73086db4dc23d478))

## [1.15.0](https://github.com/maoudia/RetroBoard/compare/v1.14.0...v1.15.0) (2026-10-31)


### Features

* **composer:** writing area size (small, normal, large) remembered per board ([45393de](https://github.com/maoudia/RetroBoard/commit/45393de3e7f0177d6ab5f3fe6ae3dfd15043f916))

## [1.14.0](https://github.com/maoudia/RetroBoard/compare/v1.13.0...v1.14.0) (2026-10-31)


### Features

* **columns:** personal column width (narrow, normal, wide, full) with Alt+arrows, remembered per board ([634fe23](https://github.com/maoudia/RetroBoard/commit/634fe2328023c56a42cc4bdb41c503725f8a1339))

## [1.13.0](https://github.com/maoudia/RetroBoard/compare/v1.12.0...v1.13.0) (2026-10-31)


### Features

* **columns:** sort a column by newest, author, colour, cluster size or A to Z ([a924312](https://github.com/maoudia/RetroBoard/commit/a92431224ccca98d773c9a3198d42357f5207c88))

## [1.12.0](https://github.com/maoudia/RetroBoard/compare/v1.11.0...v1.12.0) (2026-10-31)


### Features

* **ideation:** freeze a whole cluster from its panel with a badge on the stack ([fbe50d4](https://github.com/maoudia/RetroBoard/commit/fbe50d4dc4de4fa9428966cbb66f3ad30dfde1f0))

## [1.11.0](https://github.com/maoudia/RetroBoard/compare/v1.10.0...v1.11.0) (2026-10-31)


### Features

* **ideation:** freeze notes and clusters so the facilitator can lock an idea ([b368366](https://github.com/maoudia/RetroBoard/commit/b368366e1cbb07f29940f9ab5ba4082f9eacd2d2))

## [1.10.0](https://github.com/maoudia/RetroBoard/compare/v1.9.0...v1.10.0) (2026-10-31)


### Features

* **agenda:** phase stepper under the toolbar with the current phase, time left and next step ([ac2534d](https://github.com/maoudia/RetroBoard/commit/ac2534daeaefda9e38141fb3d2f4715b7da4cb5e))

## [1.9.0](https://github.com/maoudia/RetroBoard/compare/v1.8.1...v1.9.0) (2026-10-31)


### Features

* **presenter:** walk through the voted ideas, one enlarged at a time ([28d4092](https://github.com/maoudia/RetroBoard/commit/28d4092dcdaded36364e025e56d829ee9a2ea45a))

## [1.8.1](https://github.com/maoudia/RetroBoard/compare/v1.8.0...v1.8.1) (2026-10-31)


### Bug Fixes

* **deps:** nuxt 4.6.3 and node-forge 1.4.1 for the OSV findings ([8112aab](https://github.com/maoudia/RetroBoard/commit/8112aab18df1ca0965984f8be9acb40575ca8d2a))

## [1.8.0](https://github.com/maoudia/RetroBoard/compare/v1.7.0...v1.8.0) (2026-10-31)


### Features

* **identity:** ask the latest joiner with a duplicate name to pick another ([9383b25](https://github.com/maoudia/RetroBoard/commit/9383b25390183506cc622cffea90a3edf36c1ae1))

## [1.7.0](https://github.com/maoudia/RetroBoard/compare/v1.6.1...v1.7.0) (2026-10-31)


### Features

* **presenter:** focus one column in presenter mode, centre zoom or accordion ([92e76dc](https://github.com/maoudia/RetroBoard/commit/92e76dc3461eb19db6f5fec3d4aeaa49ee4f3881))
* **shortcuts:** key caps next to toolbar actions, off in the profile; no shortcut text in the composer hint ([5d74b28](https://github.com/maoudia/RetroBoard/commit/5d74b28e5c681de51df8f76384f57703c7d2773a))
* **timer:** start or pause the agenda from the clock, and an option to start it at board creation ([0e17ebc](https://github.com/maoudia/RetroBoard/commit/0e17ebc2443182dc81bb4876cb8656e73598f871))

## [1.6.1](https://github.com/maoudia/RetroBoard/compare/v1.6.0...v1.6.1) (2026-10-30)


### Bug Fixes

* **web:** phone toolbar and vote bar fit 360 px, readable disabled buttons, no spurious takeover toast ([d86f0fc](https://github.com/maoudia/RetroBoard/commit/d86f0fcce8203f37fc202d37da8a7576a6042e11))

## [1.6.0](https://github.com/maoudia/RetroBoard/compare/v1.5.0...v1.6.0) (2026-10-30)


### Features

* **composer:** colour swatches, 160 character default, compact counter, help popover and signature toggles ([e43e1fb](https://github.com/maoudia/RetroBoard/commit/e43e1fb67f790acba3db92f9e8b96c7df1696822))
* **voting:** segmented voting state control and go-to-closing ([e4c3fcf](https://github.com/maoudia/RetroBoard/commit/e4c3fcf4b56cbccac2dbe47ecd147c311f023170))

## [1.5.0](https://github.com/maoudia/RetroBoard/compare/v1.4.0...v1.5.0) (2026-10-30)


### Features

* **templates:** change the board format and keep the notes, with a preview of where they land ([3993a2d](https://github.com/maoudia/RetroBoard/commit/3993a2d3c4c01aa0a4b8868c3b33aaab58aa2fef))

## [1.4.0](https://github.com/maoudia/RetroBoard/compare/v1.3.1...v1.4.0) (2026-10-30)


### Features

* **grouping:** better cluster titles from shared phrases, folded plurals and word-boundary cuts ([df79208](https://github.com/maoudia/RetroBoard/commit/df792085893aef27a5803896dd0671718aef992c))
* **grouping:** move a whole cluster to another column by drag or from its menu ([d3d54e3](https://github.com/maoudia/RetroBoard/commit/d3d54e3ce3048cd3a2426679a7bbbab3b4be5814))

## [1.3.1](https://github.com/maoudia/RetroBoard/compare/v1.3.0...v1.3.1) (2026-10-30)


### Bug Fixes

* **access:** a profile rename updates the earlier signed notes for everyone ([#229](https://github.com/maoudia/RetroBoard/issues/229)) ([a98fe45](https://github.com/maoudia/RetroBoard/commit/a98fe451c71567065ab610bebf1cd3664f76f846))

## [1.3.0](https://github.com/maoudia/RetroBoard/compare/v1.2.0...v1.3.0) (2026-10-30)


### Features

* **report:** ROTI vote (1 to 5) and its distribution in the report ([c1ef1c0](https://github.com/maoudia/RetroBoard/commit/c1ef1c0866c3f06ad343b5d85e9c61c3c725b685))
* **web:** hover peek into a cluster (300 ms, pointer devices only) ([7811488](https://github.com/maoudia/RetroBoard/commit/78114886ae218a1b05e8a0846da27faf180ec7e7))
* **web:** spring open and close for clusters (FLIP, reduced-motion safe) ([6a855bf](https://github.com/maoudia/RetroBoard/commit/6a855bfb6708b39df4dafdddfbc4d39b12636d65))


### Bug Fixes

* **web:** avatar stays round, presenter mode zooms columns only, one-word landing call to action ([4f53cda](https://github.com/maoudia/RetroBoard/commit/4f53cdab2ba3706ce1733e6a249cc9a530595b2e))
* **web:** drafts come back when the board refuses their publication ([cf5af9f](https://github.com/maoudia/RetroBoard/commit/cf5af9f2bc1aaf565a2c13b62d6abb90247a9b20))
* **web:** no vote buttons and a disabled Close voting outside the vote phase ([329d8ea](https://github.com/maoudia/RetroBoard/commit/329d8eaaca30df8b7fbab1386ccc77b19c8262f9))
* **web:** scroll padding follows the real toolbar height, budget 270 kB, browser-aware e2e checks ([c267548](https://github.com/maoudia/RetroBoard/commit/c2675486e3c14261f27a02d763e1790d73ee58f3))
* **web:** the time available at board creation picks the agenda preset ([d48b3ed](https://github.com/maoudia/RetroBoard/commit/d48b3ed0d39711ceef3a8027960a5e3a5c0b8951))

## [1.2.0](https://github.com/maoudia/RetroBoard/compare/v1.1.0...v1.2.0) (2026-10-25)


### Features

* **a11y:** drag alternatives, group with... in the note menu ([287de78](https://github.com/maoudia/RetroBoard/commit/287de782c38f1105a094206d59be84c41a601811))
* **a11y:** shared live regions with merged polite messages and an assertive timer end ([e9c1654](https://github.com/maoudia/RetroBoard/commit/e9c16541052b035e1eca4b49bd06984172c6b749))
* **a11y:** skip link, accessibility statement page, scroll padding and 24 px target floor ([64aad61](https://github.com/maoudia/RetroBoard/commit/64aad613693f6e7c3fc28aaf9ad01bfdc8e5853b))
* **a11y:** WCAG 2.2 AA gate in light, dark and phone, theme contrast for every token pair ([b32151c](https://github.com/maoudia/RetroBoard/commit/b32151cb3e2c5f0d4e96a415950f9c46a1b9ce0e))
* **access:** everyone facilitates by default; phase rules apply to everyone ([3d09c12](https://github.com/maoudia/RetroBoard/commit/3d09c129074e7a41cb36778cafd8fd80959916a3))
* **access:** take over facilitation with the facilitator link ([97a8e8c](https://github.com/maoudia/RetroBoard/commit/97a8e8cb6f9b09fd9e47c379a0b2690913f7f461))
* **actions:** action badge on notes and groups, link from an action to its idea ([4f1a927](https://github.com/maoudia/RetroBoard/commit/4f1a927dcc08b872fa3e10ef16ee8f4aa94de914))
* **actions:** action.add keeps a link to its source note or group ([a43241d](https://github.com/maoudia/RetroBoard/commit/a43241d184fc05bdb061e5c439748ab442097e18))
* **actions:** create an action from a note or a group ([8643e7f](https://github.com/maoudia/RetroBoard/commit/8643e7f17c504a801d914c80accf661197291159))
* **actions:** voted ideas section and connected-first owner dropdown ([91895b6](https://github.com/maoudia/RetroBoard/commit/91895b66794489862230de71951773827a162e92))
* **actions:** votedIdeas and ownerChoices read models ([51809d1](https://github.com/maoudia/RetroBoard/commit/51809d1adf35c695471525dd9aa36792977bc4be))
* **application:** ringProgress read model for activity rings ([85cfcc6](https://github.com/maoudia/RetroBoard/commit/85cfcc6fb2c1b1aab416d9a39959096167b723ab))
* **board:** personal filter and a similar-idea hint while writing ([d574596](https://github.com/maoudia/RetroBoard/commit/d574596cd2d129e6ed1e0fd9ede827ee62a8c24b))
* **board:** presenter mode for screen sharing and room screens ([02ce8bd](https://github.com/maoudia/RetroBoard/commit/02ce8bd0817b154392ae39b2fe782b8ec33ad6fa))
* **domain:** board.destroy, column and vote reset, previous phase, phase clock reset ([6acc505](https://github.com/maoudia/RetroBoard/commit/6acc505c7d7fb89f268ffa454003c6c696f62cec))
* **domain:** noteMaxLength setting (40..500, default 280) enforced by the fold ([734c129](https://github.com/maoudia/RetroBoard/commit/734c129456b6abb4f6f6a5c461f9c646741f6fe5))
* **edge:** HSTS, http-to-https redirect, smoke checks and edge runbook ([dba7e46](https://github.com/maoudia/RetroBoard/commit/dba7e468719c279d65fef4c8cba4139fc7111ba9))
* **keyboard:** shortcuts with roving focus, facilitator keys and help overlay ([7808000](https://github.com/maoudia/RetroBoard/commit/78080006e1b3191abafd1494b9e4cd3611ac5cdd))
* **legal:** legal notice, privacy and terms pages for the beta (fr, en) ([64abc14](https://github.com/maoudia/RetroBoard/commit/64abc1418e0c4ca67fd3edf013d6e50e5eab2200))
* **moderation:** participant.remove, participant.rename and drafts.reveal in the domain, protocol and commands ([7c78ab1](https://github.com/maoudia/RetroBoard/commit/7c78ab176765dcc70c77cea9a6bc9f2986641557))
* **moderation:** rename a participant and reveal all drafts (facilitator) ([d6b8e1a](https://github.com/maoudia/RetroBoard/commit/d6b8e1a228e6e8fc33ab69f9833767c01e31b3c3))
* **notes:** Add and Publish now buttons, composer text kept locally, return key adds a line on touch ([0710ef2](https://github.com/maoudia/RetroBoard/commit/0710ef2ad4cd84592e482063aa08600afd92a757))
* **notes:** hover swatches and a palette sheet to recolour notes ([a40f921](https://github.com/maoudia/RetroBoard/commit/a40f921ca353eaa60fcbb1af9b0d0cd4e14524bb))
* **notes:** hover validate and dismiss on drafts and edited notes (touch keeps them visible) ([09cb70c](https://github.com/maoudia/RetroBoard/commit/09cb70c92b1461f4bb5845f3a650cdf50d831d27))
* **notes:** live character counter and the note length setting in Options ([73d12ae](https://github.com/maoudia/RetroBoard/commit/73d12aea6cd0cf9c6de6d159c7a2d602c1e0416a))
* **notes:** shared sticky palette (light/dark) and per-column default colour ([a544db7](https://github.com/maoudia/RetroBoard/commit/a544db7e9452b4d2486a91724d451abc3922a561))
* **p2p:** board events and cursors travel peer to peer (WebRTC mesh) ([39ab558](https://github.com/maoudia/RetroBoard/commit/39ab5585de399c4e088c69681e64d4bf0448aea0))
* **presence:** live pointers anchored to notes, focus markers on touch screens ([7150873](https://github.com/maoudia/RetroBoard/commit/715087332ab4bc27d30e9cb79f4eaed07fdd2b6f))
* **presence:** typing and idle status in the participants menu ([f00f736](https://github.com/maoudia/RetroBoard/commit/f00f736328a86d4343521588b5849706db77c7dc))
* **profile:** name shown on notes by default, signature chip in the composer ([167258f](https://github.com/maoudia/RetroBoard/commit/167258f70865b9ce46a57f3e9a4e30f65b5b6c51))
* **publishing:** undo a publication, keyboard shortcuts, leave guard ([894e408](https://github.com/maoudia/RetroBoard/commit/894e408152a56f29c90991b293206afd918e05f1))
* **relay:** capacity limits users can see, adaptive cursors, load test ([546677f](https://github.com/maoudia/RetroBoard/commit/546677f9ea810b79386f4e9cf5f6606c972e2df2))
* **relay:** maintenance mode (503) and too-many-requests page (429) with static fallbacks ([87e1fe7](https://github.com/maoudia/RetroBoard/commit/87e1fe730ab0a0e78470c4af4606a3b3db7fd212))
* **relay:** real 404 status for unknown paths, html for browsers and text for scripts ([7d74141](https://github.com/maoudia/RetroBoard/commit/7d741414920c0cf693cef91145c27964f11a0e71))
* **report:** retro report on the device, printable and as one HTML file ([40dedb4](https://github.com/maoudia/RetroBoard/commit/40dedb47cfa8111d749b5a24da5c6eeedfb0dabc))
* **sharing:** invite panel on new boards, chat and email messages, local QR code ([d338676](https://github.com/maoudia/RetroBoard/commit/d3386764208afa3b2a51ac1d19bb977291b31525))
* **sharing:** three board words everyone can read out loud ([1451061](https://github.com/maoudia/RetroBoard/commit/1451061618ab4992a6829c8e3f070bd8c92c2108))
* **sync:** board events on two paths with anti-entropy, local-first outbox, single creator ([079c0cf](https://github.com/maoudia/RetroBoard/commit/079c0cfd0aa6e17e55edb89e08f912f040e0ebc9))
* talk time with rings and announcements, export by destination ([d80e9cd](https://github.com/maoudia/RetroBoard/commit/d80e9cddb5de43d3f6b60518e04432094acd1339))
* **timer:** end-of-time popup for the agenda phase and the shared countdown ([10660f6](https://github.com/maoudia/RetroBoard/commit/10660f6e93208d01ebe41cc66cca2de57711d887))
* **timer:** one-minute toast, "started phase" toast, system notification and chime ([1c9ccb0](https://github.com/maoudia/RetroBoard/commit/1c9ccb01cc8ac37c6dc8e1a763592949844a3d60))
* **timer:** pure timerEvents for the warning and the end of a phase ([3e324ea](https://github.com/maoudia/RetroBoard/commit/3e324ea62684b71919f9b7c7804d11e7dc322c0f))
* **web:** branded 404 and 500 pages with typo suggestions and error id ([267d7bd](https://github.com/maoudia/RetroBoard/commit/267d7bd3bb311df7b4822bc9af4691a7a23311eb))
* **web:** choose who facilitates at creation; facilitator link under Advanced on open boards ([bb96f63](https://github.com/maoudia/RetroBoard/commit/bb96f635dc56fa477f22c219cd165f2a060a4f70))
* **web:** closed composer when the phase does not allow writing ([159fb49](https://github.com/maoudia/RetroBoard/commit/159fb49bc9c5e9de5e9dd6b66e72e33eb7e613ca))
* **web:** closed cue on votes and actions; phase change announces what opened and closed ([2353445](https://github.com/maoudia/RetroBoard/commit/2353445537ceda51678ffce410cdb0860b81ec20))
* **web:** concentric activity rings in the agenda timer ([0fe7070](https://github.com/maoudia/RetroBoard/commit/0fe7070cfefaac432704347fe6e1c083c79eec36))
* **web:** crown on the lead facilitator; facilitator link card with hand-over ([8775db4](https://github.com/maoudia/RetroBoard/commit/8775db471ee77bcd70becbadb4da0f2f1c259e49))
* **web:** destroy a board with title confirmation, local copies wiped, closed-board page ([4f52814](https://github.com/maoudia/RetroBoard/commit/4f52814dc9c39061d97675f07be08b364268b788))
* **web:** development catalogue of service pages ([45cf45e](https://github.com/maoudia/RetroBoard/commit/45cf45ec3fc0d351643f14e05cb78db0d1903144))
* **web:** draft-first composer, Add primary on the right and Publish now before it ([15af8fc](https://github.com/maoudia/RetroBoard/commit/15af8fc4cfa23236380e8c72f8b8c8850ee15a27))
* **web:** large activity rings in the agenda panel and presenter mode ([3a7686e](https://github.com/maoudia/RetroBoard/commit/3a7686e66ff3753c5e494596873373617cd792c1))
* **web:** offline, unsupported-browser and invalid-link service pages ([e52f961](https://github.com/maoudia/RetroBoard/commit/e52f96160bc9b9f91d036b991eca6801afbdd81e))
* **web:** reset menu (column, votes, clocks), previous phase, everyone-toasts ([c690ade](https://github.com/maoudia/RetroBoard/commit/c690adef4add64935dfa31e1e324996077566a62))
* **web:** results charts for the vote (top ideas, per column, participation) ([394d938](https://github.com/maoudia/RetroBoard/commit/394d938daab4be0843931bff79faa00c4695061d))
* **web:** suggest choosing a name to anonymous participants ([06cea3b](https://github.com/maoudia/RetroBoard/commit/06cea3bd05f608da3038817a7bbfdb981e0a77d7))


### Bug Fixes

* **ci:** exporters mutation regression and bundle budget ([08a909c](https://github.com/maoudia/RetroBoard/commit/08a909cf5f8b3102bc49c0d550481aa18803a032))
* **deps:** override katex to 0.18.2 or later (GHSA-238p-pmpm-9mq7) ([0295b96](https://github.com/maoudia/RetroBoard/commit/0295b96f9906a2327dbc804decf59af1ecbc14a8))
* **sync:** resend my pointer and focus when a direct link opens; restore spec enters a name ([e331384](https://github.com/maoudia/RetroBoard/commit/e33138417b70c054a872f07a97c647c4c5dc6c21))
* **web:** type errors that failed CI checks since bb96f63 ([5b99d28](https://github.com/maoudia/RetroBoard/commit/5b99d28981a6f91fe9da728850b3591d945f31ec))

## [1.1.0](https://github.com/maoudia/RetroBoard/compare/v1.0.0...v1.1.0) (2026-10-24)


### Features

* **agenda:** time-boxed agenda with phase ring and rules; faster CI ([d75cc35](https://github.com/maoudia/RetroBoard/commit/d75cc357a0cbce842fec6ed6a5bf67fd5e6d8955))
* **clusters:** merge clusters, title suggestions, expand all per column ([c3fae4c](https://github.com/maoudia/RetroBoard/commit/c3fae4c59d4a31a982276af9a1472acf9d162d36))
* **crypto:** add WebCrypto primitives package ([ef49d5e](https://github.com/maoudia/RetroBoard/commit/ef49d5ee2ab81f722f4c6d247d158a42a21e9216))
* **crypto:** native curve detection with @noble/curves fallback and /check page ([4f3a004](https://github.com/maoudia/RetroBoard/commit/4f3a0044f332906c5b5fa255199335f05b461926))
* **domain:** add KeyRing and invite fragment codec ([8f1c69a](https://github.com/maoudia/RetroBoard/commit/8f1c69ae145666108b7007975cd8ee4c0a1ad668))
* **domain:** signed genesis, facilitator capability and authorship fold ([8494bdf](https://github.com/maoudia/RetroBoard/commit/8494bdfe1286885dc1d6496339a2d4b267ca6145))
* **edge:** publish security.txt (RFC 9116) and SECURITY.md ([9b7b090](https://github.com/maoudia/RetroBoard/commit/9b7b090551b70fbb776b957464e61fe58254506f))
* **facilitation:** roles, hand-over, open facilitation and hide participant ([dc0a477](https://github.com/maoudia/RetroBoard/commit/dc0a47796961de9d63584670cebfe03050ce60cf))
* **relay:** serve the WebMCP origin trial token per host; bump CI actions ([f38b98a](https://github.com/maoudia/RetroBoard/commit/f38b98a24d2bb553bb08bee2ca01d6dc308e542d))
* RetroBoard, themeable real-time retro board (Nuxt static + Cloudflare Durable Objects) ([216ef79](https://github.com/maoudia/RetroBoard/commit/216ef7963d4116ea74377a5cb770dc21c4fbf3d6))
* **sync:** hybrid clock, version vectors, fold checkpoints and rate limits ([c5ef8b8](https://github.com/maoudia/RetroBoard/commit/c5ef8b83d733496c7b52aed685e4ab0574b9f17c))
* **themes:** imposed board theme with personal light/dark variant; WebKit nightly ([4f7a357](https://github.com/maoudia/RetroBoard/commit/4f7a35755b4d841e4931d76549fe3f442312342f))
* voting v2 with ranking, and actions v2 with carry-over ([d763ed4](https://github.com/maoudia/RetroBoard/commit/d763ed41fd0d7d0df931308354a414a0a6d6d3d7))
* **web:** encrypted local replica, retention setting and board file ([072b5cb](https://github.com/maoudia/RetroBoard/commit/072b5cb5adbf452585a0195001c316fdd513f809))
* **web:** lazy-load the MCP-B WebMCP polyfill when opted in without native support ([3f60006](https://github.com/maoudia/RetroBoard/commit/3f600062aa3584a9509c662199a00f26ba652241))
* WebMCP tools for AI agents in the browser (opt-in, human-confirmed writes) ([e5f0645](https://github.com/maoudia/RetroBoard/commit/e5f06453ed0d27453e7454ebeda5dde194210915))
* **web:** optional passcode for encrypted boards ([c86b39c](https://github.com/maoudia/RetroBoard/commit/c86b39c3567147a80e08b3b16e03705530bffa1c))
* **web:** share dialog explains encryption; facilitator link on demand; docs ([eb0ea29](https://github.com/maoudia/RetroBoard/commit/eb0ea2976c0eebe3ba91268c237632204d3a260c))


### Bug Fixes

* **a11y:** results action buttons name starts with their visible text; raise mutation floors ([c7e38f4](https://github.com/maoudia/RetroBoard/commit/c7e38f42868a8d25b18ef2d0db5185761a2b277c))
* **ci:** call the license script with pnpm run; 'pnpm licenses' is a pnpm ([4f3a004](https://github.com/maoudia/RetroBoard/commit/4f3a0044f332906c5b5fa255199335f05b461926))
* **ci:** shellcheck-clean spec gate, licence errors as annotations, security overrides ([337e28e](https://github.com/maoudia/RetroBoard/commit/337e28e5ba15d893520d837128f78af2fe28fafc))
* force the static Nitro preset so Cloudflare Workers Builds uses wrangler.jsonc ([516879b](https://github.com/maoudia/RetroBoard/commit/516879be21edd462d0f94c76c7f26a52e0fc0709))
* **ui:** languages listed EN, FR, then automatic; no emoji before theme names ([a06a14e](https://github.com/maoudia/RetroBoard/commit/a06a14e4ec93ff7084e441644f0df0c1199d0d44))
* **web:** cross-browser CSP, a11y and dialog race found by the e2e matrix ([709b084](https://github.com/maoudia/RetroBoard/commit/709b0841295210b10fa1580e8866bd11a31f3855))
