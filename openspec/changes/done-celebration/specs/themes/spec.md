## ADDED Requirements

### Requirement: Celebration of a finished idea
Each theme SHALL define one celebration, played on a post-it or cluster at the moment the action born from it goes to done, built only from the theme's own tokens, lasting at most 1.5 seconds, never taking focus and never blocking input. The celebration SHALL be derived from the board state, so it plays on every device that sees the change live, and SHALL NOT play for a replayed event, a history load, an undo, or a device that joins and catches up.

#### Scenario: Done on a sticky board
- **WHEN** a participant marks the action of a post-it as done on a board with the sticky theme
- **THEN** that post-it, and the same action in the drawer on every connected device, play the sticky celebration once and then return to their normal look

#### Scenario: Joining late
- **WHEN** a participant opens a board whose ideas are already done
- **THEN** no celebration plays

#### Scenario: Several ideas done at once
- **WHEN** more than three ideas reach done within two seconds
- **THEN** at most three celebrations play one after the other and the rest collapse into one combined burst

#### Scenario: Reduced motion
- **WHEN** the device asks for reduced motion or the motion setting is reduced
- **THEN** no animation plays and a static check mark shows for 600 milliseconds

#### Scenario: Screen reader
- **WHEN** a celebration plays
- **THEN** the polite live region announces that the idea is done, once

### Requirement: Celebrations use the shared design tokens and the strict CSP
A celebration SHALL use class-based animations or a bounded particle canvas, SHALL load nothing from a third-party origin, and SHALL take its durations, radii and colours from the shared tokens.

#### Scenario: CSP guard
- **WHEN** every celebration plays during the end-to-end guard test
- **THEN** no CSP violation and no console error are reported
