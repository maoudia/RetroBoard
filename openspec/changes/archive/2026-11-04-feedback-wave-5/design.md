# Design

- Voting closes in the domain handlers (event-sourced, every peer reaches the same state), not in the UI. Going back a phase after the end does not reopen voting; the facilitator reopens it explicitly.
- Chat roster: `compact` above four people; the strip lists typing first, then me, at most seven faces, the rest as +N; names stay in the DOM for screen readers.
- Writing size: neutral outlined squares, the selected one filled with the text colour on a soft surface; no accent colour. "All columns" uses the columns icon with `aria-pressed`.
- Open cluster: grid `repeat(auto-fill, minmax(min(100%, 9.5rem), 1fr))`, footer flex-wrap with `min-width: 0`; the panel hides horizontal overflow.
- Walk-through: same ranking and keys, the card becomes a non-modal dock; the board element with the idea gets `data-walk` (outline) and is scrolled into view; reduced motion uses an instant scroll.
- Presenter notes: `data-long` (more than 110 characters) spans the whole row with a 64 rem cap.
