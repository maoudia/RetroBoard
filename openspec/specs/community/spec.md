# community Specification

## Purpose
How people tell the project what they need: reporting a bug, suggesting an idea and joining the discussion from the landing page, the help menu and the footer, through GitHub issue forms that never carry board content.

## Requirements

### Requirement: Feedback call to action
The landing page, the help menu and the footer SHALL offer to report a bug, suggest a feature and join the discussion, with links to the owner's public profiles.

#### Scenario: Report a bug from a board
- **WHEN** Alice chooses "Report a bug" on a board
- **THEN** a GitHub issue form opens prefilled with the app version and browser, and the link carries no board content, room id or key
