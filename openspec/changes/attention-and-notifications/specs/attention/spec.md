## ADDED Requirements

### Requirement: The hidden tab shows that something needs the person
When the tab is hidden and an enabled category raises attention, the tab SHALL show it without relying on colour alone: the favicon gets a dot or a count (up to 9+), the title gets a prefix with the same count, and an installed app gets a badge with the count. All of it SHALL clear when the person returns to the tab or marks the items read.

#### Scenario: Voting opens in another tab
- **WHEN** the tab is hidden and a facilitator opens voting
- **THEN** the favicon shows a dot, the title starts with "(1)" and the installed app badge shows 1

#### Scenario: The person comes back
- **WHEN** the person switches back to the tab
- **THEN** the favicon, the title and the badge return to normal

#### Scenario: Count and overflow
- **WHEN** eleven items are waiting
- **THEN** the favicon shows 9+ and the title and badge show 11

### Requirement: Nothing is raised while the person is looking
Attention SHALL NOT be raised while the tab is visible and focused; the in-page toasts and live regions keep telling the person what happens.

#### Scenario: Focused tab
- **WHEN** the tab is visible and a phase changes
- **THEN** no favicon dot, title prefix, badge or system notification appears

### Requirement: Categories are on or off
A notification category that is off SHALL NOT raise the favicon, the title, the badge or a system notification; a quiet category that is off MAY still appear in the away digest.

#### Scenario: Turning a quiet category on
- **WHEN** the person turns "chat message" on
- **THEN** a chat message while the tab is hidden raises the favicon dot and the title count

### Requirement: Important categories are on by default
The categories phase changed, timer ending, your turn to talk, voting opened or about to close, action assigned to you, mentioned or answered in the chat, and the facilitator calls everyone back SHALL be important and on by default; new idea in my column, chat message, someone joined or left and presenter started SHALL be quiet and off by default.

#### Scenario: Defaults for a new person
- **WHEN** a person who never opened the notification centre is in another tab and a new idea appears in their column
- **THEN** nothing is raised, and a phase change does raise attention

### Requirement: Do not disturb
A do-not-disturb mode SHALL keep every item for the away digest and SHALL show nothing and play no sound, indefinitely or for a chosen duration; its state SHALL be visible in the toolbar.

#### Scenario: One hour of silence
- **WHEN** the person turns do-not-disturb on for one hour and voting opens
- **THEN** nothing is shown, and the digest on return lists "voting opened"

### Requirement: Away digest
When the person returns to the tab after items were raised or kept, the page SHALL show one calm summary in plain words and numbers, with a button to mark everything read; the summary SHALL be a polite live region and SHALL go away by itself after reading time.

#### Scenario: Three ideas and a vote
- **WHEN** the person returns after three new ideas appeared and voting opened
- **THEN** the digest says "While you were away: 3 ideas, voting opened" and offers "Mark all as read"

#### Scenario: Nothing happened
- **WHEN** the person returns and nothing was raised or kept
- **THEN** no digest is shown

### Requirement: Optional title blink
The page SHALL offer a gentle title blink while the tab is hidden with items, off by default, and SHALL NOT blink when the person prefers reduced motion.

#### Scenario: Reduced motion
- **WHEN** the person prefers reduced motion and the blink option is on
- **THEN** the title stays static with its prefix

### Requirement: No server, no push service
Attention SHALL be computed on the device from events already in the board log; no attention data SHALL be sent to the relay or to any third party, and Web Push SHALL NOT be used.

#### Scenario: Network check
- **WHEN** an attention item is raised
- **THEN** no request leaves the page and the relay receives no additional message

### Requirement: Graceful degradation
Each attention surface SHALL degrade silently in this order when unsupported: system notification, app badge, favicon, title prefix, away digest; the notification centre SHALL tell the person which surfaces work on this browser.

#### Scenario: iPhone in a normal tab
- **WHEN** the board is open in a normal Safari tab on iOS
- **THEN** the title prefix and the digest work and the centre explains that system notifications need the installed app
