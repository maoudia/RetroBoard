## ADDED Requirements

### Requirement: Chat button snaps to the screen edges
The floating chat button SHALL move to the nearest screen edge when it is released, or to the nearest corner when it is released near two edges, and SHALL keep its position along the edge.

#### Scenario: Release in the middle of the screen
- **WHEN** a person drags the chat button and releases it nearer to the right edge than to any other
- **THEN** the button settles on the right edge at the height where it was released

#### Scenario: Release near a corner
- **WHEN** the button is released within one button width of both the bottom and the left edge
- **THEN** the button settles in the bottom left corner

#### Scenario: Reduced motion
- **WHEN** the person has asked for reduced motion
- **THEN** the button jumps to its resting place without an animation

### Requirement: Chat button remembers its place
The chat button SHALL keep its place on this device as an edge and a fraction along it, SHALL restore it on the next visit and after a rotation or a resized window, and SHALL NOT send it to the board, to the other participants or to the server.

#### Scenario: Rotate the phone
- **WHEN** the button rests at the middle of the right edge and the device is rotated
- **THEN** the button is again at the middle of the right edge of the rotated screen, inside the screen

#### Scenario: Old free position
- **WHEN** a device holds the previous pixel position of the chat bubble
- **THEN** it is converted once to the new place and the old value is removed

### Requirement: Chat button keeps out of the way
The chat button SHALL NOT rest over the safe areas of the device, the toolbar, the presenter bar or the action buttons of a column composer, and SHALL rest above the soft keyboard while it is open; when its place is taken it SHALL slide along the edge to the nearest free slot without changing the stored place.

#### Scenario: Composer buttons
- **WHEN** the stored place would cover the add button of a column on a phone
- **THEN** the button rests next to it, on the same edge, and returns to the stored place once nothing is in the way

#### Scenario: Keyboard
- **WHEN** a person types a note and the soft keyboard opens
- **THEN** the button is fully visible above the keyboard

### Requirement: Free position by choice
The profile SHALL offer a choice between snapping to the edges (default) and a free position, and a control to reset the position; in free mode the button SHALL rest where it is dropped, inside the safe area.

#### Scenario: Choose free
- **WHEN** a person selects the free position and drops the button in the middle of the screen
- **THEN** the button stays there, also after a reload

#### Scenario: Reset
- **WHEN** the person chooses "Reset position"
- **THEN** the button returns to the right edge, in the lower third, in snap mode

### Requirement: Chat button can be moved without dragging
The chat button SHALL be movable with the keyboard and without a pointer path: a menu on the button (long press, context-menu key or Shift+F10) with a "Move" mode driven by the arrow keys, Enter and Escape, and a position picker in the profile with the four corners and the four edge middles; each control SHALL have a target of at least 44 px and an accessible name.

#### Scenario: Keyboard move
- **WHEN** a person focuses the button, opens its menu, chooses Move and presses the left arrow then Enter
- **THEN** the button has moved to the next place towards the left and the move was announced politely

#### Scenario: Escape cancels
- **WHEN** the person presses Escape during a move
- **THEN** the button returns to where it was

### Requirement: Unread badge stays visible
The unread count SHALL stay attached to the chat button on every edge and corner and SHALL NOT be clipped by the screen edge.

#### Scenario: Right edge
- **WHEN** the button rests on the right edge with 3 unread messages
- **THEN** the badge shows 3 on the inner side of the button, fully on screen

### Requirement: Drawer follows the button
When the chat button rests on the left or the right edge, the chat drawer SHALL open on that side; on the top and bottom edges it SHALL open on the side chosen in the profile.

#### Scenario: Button on the left
- **WHEN** the button rests on the left edge and the person opens the chat
- **THEN** the drawer opens on the left
