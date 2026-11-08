## ADDED Requirements

### Requirement: Notification centre
The profile SHALL contain a notification centre with one labelled switch per category and its importance in words, a do-not-disturb control, a sound choice (off by default), a privacy level of the notification text, and per-board overrides (mute this board, change a category for this board).

#### Scenario: Muting one board
- **WHEN** the person mutes a board in the centre
- **THEN** that board raises no attention and the other boards keep their settings

#### Scenario: Importance in words
- **WHEN** the person reads the centre
- **THEN** each switch says whether the category is important or quiet and its default state

### Requirement: Permission in context
The page SHALL ask for the browser notification permission only after the person turns a system category on or accepts an in-page offer shown once on the first hidden-tab event, SHALL call the permission request from a user gesture, and SHALL remember a refusal and explain in the centre how to change it, while the favicon, title and badge keep working.

#### Scenario: Never on load
- **WHEN** a person opens a board for the first time
- **THEN** no permission prompt appears

#### Scenario: Refused
- **WHEN** the person refused the permission
- **THEN** the centre says so with the way to change it, and the favicon dot still works

### Requirement: Notification text protects the board
The text of a system notification SHALL be localised in French or English and SHALL by default contain no idea text, no chat text and no names; the levels names and full SHALL be opt-in per device and SHALL say in words that the text will appear in the operating system's notification centre.

#### Scenario: Default text
- **WHEN** a new idea appears in a person's column with the category turned on
- **THEN** the notification reads "New idea in Start" and does not contain the idea

#### Scenario: Full text opted in
- **WHEN** the person chose the level full
- **THEN** the notification contains the idea text

### Requirement: Grouping and rate limit
A system notification SHALL replace the previous one of the same category (one tag per category) with a count, and the page SHALL show at most one system notification per 5 seconds and six per minute per board, the rest feeding only the favicon and the digest.

#### Scenario: A burst of ideas
- **WHEN** ten ideas arrive in a column within ten seconds
- **THEN** one notification at a time shows "10 new ideas" instead of ten notifications

### Requirement: Notification click goes to the right place
Clicking a system notification SHALL focus the tab and open the panel that matches its category (voting bar, agenda panel, chat, actions) and SHALL mark that category read.

#### Scenario: Chat reply
- **WHEN** the person clicks a "Reply in the chat" notification
- **THEN** the tab is focused, the chat panel is open and the category is marked read

### Requirement: The single time-is-up switch becomes the centre
The former system-notification switch SHALL be replaced by the centre; a person who had it on SHALL keep "timer ending" and "phase changed" on for system notifications without being asked again.

#### Scenario: Migration
- **WHEN** a person who turned the old switch on opens the new version
- **THEN** their timer and phase categories send system notifications and the permission is not requested again
