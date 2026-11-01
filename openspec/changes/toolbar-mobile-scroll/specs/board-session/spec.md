## ADDED Requirements

### Requirement: Toolbar slides horizontally on small screens
On narrow screens the toolbar tools SHALL stay on a single row that scrolls horizontally instead of wrapping, so that the columns keep their space.

#### Scenario: Phone
- **WHEN** a participant opens a board at 360 px wide
- **THEN** the toolbar is at most two rows high, the tools row scrolls sideways, and a focused tool is scrolled into view

#### Scenario: Menus
- **WHEN** the participant opens a toolbar menu while the row is scrolled
- **THEN** the menu opens next to its button, not clipped by the row
