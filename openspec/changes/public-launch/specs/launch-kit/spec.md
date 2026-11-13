# Spec Delta

## Purpose
The material of a public launch, kept in the repository and produced from the real product, and the readiness check that says in one command whether the launch gate is met.

## ADDED Requirements

### Requirement: Launch material in the repository
The repository SHALL keep the launch material under `docs/launch/`: one post per channel (Show HN, Product Hunt, LinkedIn, dev.to) in French and English, a demo video of at most 30 seconds with captions in both languages and no sound required, and one screenshot per theme in light and dark.

#### Scenario: Post content
- **WHEN** the owner opens a launch post
- **THEN** it says what the product does, that the code is AGPL-3.0, that nothing is stored and boards are end-to-end encrypted, links the landing, the repository and the user guide, and names no feature the landing does not name

### Requirement: Launch material produced from the product
The demo video and the screenshots SHALL be produced by one command from the generated site, on a demo board the command creates, the video being cut from the landing walkthrough; a check in `pnpm verify` SHALL fail when their sources changed and the material was not regenerated.

#### Scenario: A theme is added
- **WHEN** a theme is added to the themes package and the launch screenshots are not regenerated
- **THEN** `pnpm verify` fails and names the command that regenerates them

#### Scenario: Demo content only
- **WHEN** the command takes the screenshots and the video
- **THEN** every board shown was created by the command with invented content, never opened from a real link

### Requirement: Launch gates
The launch gates SHALL be: the nightly streak against its target, Lighthouse on the landing on mobile (performance and accessibility, median of three runs), axe without violation on the public pages, the CLA live (no draft notice in `docs/CLA.md`, the signatures branch present, the `CLA` status required on `main`), the brand and landing changes archived, and the user guide reachable from the app; their values SHALL be kept in one file that the roadmap quotes.

#### Scenario: CLA still a draft
- **WHEN** `docs/CLA.md` carries a draft notice
- **THEN** the CLA gate fails and names the notice

#### Scenario: Roadmap and gates disagree
- **WHEN** `docs/roadmap.md` quotes a gate value different from the gates file
- **THEN** the doc test fails and names the value

### Requirement: Launch readiness check
The project SHALL provide one command that evaluates every launch gate, prints one line per gate with its value and pass or fail, exits non-zero when a gate fails, and writes its result with the date to `docs/launch/readiness.md`.

#### Scenario: Gate not met
- **WHEN** the streak is 9 of a target of 14 and every other gate passes
- **THEN** the command prints the streak line as failed with 9 of 14, the other lines as passed, and exits non-zero

#### Scenario: All gates met
- **WHEN** every gate passes
- **THEN** the command exits zero and `docs/launch/readiness.md` records each value and the date

### Requirement: Mobile Lighthouse budget
The local Lighthouse gate SHALL audit the landing on the mobile form factor as well as on desktop, SHALL keep the median of three runs for the landing on mobile, and SHALL apply a performance budget of 0.95 to the landing on mobile while the other pages keep their budgets.

#### Scenario: Landing regresses on mobile
- **WHEN** a change brings the landing's mobile performance median under 0.95
- **THEN** `pnpm lighthouse` fails and names the page and the form factor
