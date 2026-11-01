# Design

## Decision: keep our own handler (no library)

Evaluated: tinykeys (MIT, about 0.7 kB gzip) against `resolveShortcut` (pure, already unit tested).

- Our table matches `KeyboardEvent.key` (the typed character), which is already layout aware for letters and symbols on QWERTY and AZERTY.
- Two real gaps were found by the AZERTY fixtures, and a library would not close them either: the top digit row types `&`, `e-acute`... unshifted, and `[` / `]` need AltGr (reported as Ctrl+Alt on Windows).
- Fix in the handler: digits fall back to `event.code` (`Digit1..8`, `Numpad1..8`) when Shift is not held; AltGr (`getModifierState('AltGraph')`) is not treated as Ctrl/Alt.
- No dependency, no license or size cost; the pure function stays the single source for the help overlay.
