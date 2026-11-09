# user-documentation Specification

## Purpose
An illustrated, bilingual user guide and a short tutorial video, generated from the real application so that they match what users see and cannot silently go stale.

## Requirements

### Requirement: Illustrated bilingual guide
The product SHALL ship a user guide in French and in English that explains every user-facing feature listed in the guide manifest, each step illustrated by a screenshot of the real application taken on a demo board.

#### Scenario: A facilitator learns to run a vote
- **WHEN** a facilitator opens the guide in English and goes to the voting chapter
- **THEN** she reads the steps (enable voting, set votes per person, open and close voting) and sees one screenshot per step taken from the application with the same labels she sees on screen

#### Scenario: Same guide in French
- **WHEN** the guide is opened in French
- **THEN** every text and every screenshot is the French version, with no English string left

### Requirement: Screenshots follow the design system
The screenshots SHALL be produced by the product's own pages with its design tokens (colours, type, radius, spacing) and SHALL be available for the light and the dark variant; they SHALL show only demo content, never real board content or personal data.

#### Scenario: Dark variant
- **WHEN** a reader switches the guide to the dark variant
- **THEN** the screenshots shown are the dark ones and keep the product's look

#### Scenario: No real data
- **WHEN** the guide is generated
- **THEN** the boards it photographs are seeded demo boards created by the tour, with invented names and notes

### Requirement: The guide cannot silently go stale
A single command SHALL regenerate the whole guide, and a check that runs with the standard verification SHALL fail when a screen in the manifest can no longer be reached by the tour or when generated pages are older than the manifest they come from.

#### Scenario: A renamed control
- **WHEN** a change renames the test anchor of a control that the tour clicks
- **THEN** the guide check fails and names the guide step and the missing anchor

#### Scenario: A new feature
- **WHEN** a change adds a user-facing feature and declares its screen in the manifest
- **THEN** the guide check fails until the guide chapter and its screenshots exist

### Requirement: Agents keep the guide current
The repository instructions for coding agents SHALL require that a change touching user-facing behaviour regenerates the guide in the same change, and SHALL name the command and the manifest to update.

#### Scenario: An agent changes the toolbar
- **WHEN** an agent changes a toolbar control
- **THEN** the definition of done in the agent instructions tells it to update the manifest entry, regenerate the guide and commit the result

### Requirement: Guide reachable from the app
The Help dialog and the pages' contextual help links SHALL open the guide in the current language, and the guide SHALL load without any third-party origin, respect the strict content security policy, and pass the accessibility checks (text alternatives for screenshots, keyboard navigation, contrast).

#### Scenario: From the help dialog
- **WHEN** a participant opens the Help dialog and chooses the user guide
- **THEN** the guide opens in her language on the matching chapter

#### Scenario: From a panel
- **WHEN** a participant opens the share panel, the agenda panel or the options dialog
- **THEN** a link in the panel opens the matching guide chapter, in her language, at the step that explains that panel

#### Scenario: From the landing page
- **WHEN** a visitor opens the landing page in French or English
- **THEN** a visible badge and a footer link lead to the guide of her language

#### Scenario: Accessibility
- **WHEN** the automated accessibility check runs on a guide page
- **THEN** it reports no violation and every screenshot has a text alternative describing the step

### Requirement: Tutorial video with captions
The product SHALL offer a short tutorial video recorded from the same tour, with highlight overlays on the controls being explained and captions in French and in English; a voice-over SHALL be optional and generated offline by the owner, and the video SHALL be self-hosted.

#### Scenario: Watching without sound
- **WHEN** a person plays the video with the sound off
- **THEN** the captions in her language tell every step shown

#### Scenario: No third party at runtime
- **WHEN** the guide page with the video is loaded
- **THEN** no request leaves the product's own origin and the page shows no cookie or tracker

#### Scenario: Voice-over generation
- **WHEN** the owner generates the voice-over
- **THEN** only the narration text goes to the speech service (never board content), the service key is read from the owner's environment and is never committed, and the video still works with captions alone when no voice-over exists
