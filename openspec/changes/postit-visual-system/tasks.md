# Tasks

## 1. Palette and layout

- [ ] 1.1 Define sticky-note palettes per theme variant with contrast tests; verify the theme suite
- [ ] 1.2 Masonry column layout, text fitting with min size and "read more"; verify e2e with a 60-note fixture and visual regression
- [ ] 1.3 Density levels, zoom shortcuts and column focus mode; verify e2e

## 2. Discovery

- [x] 2.1 Per-participant search and filters; verify e2e
- [x] 2.2 Similar-idea hint (normalised token similarity, fr/en stop words) in `packages/domain` or `application`; verify unit tests

## 3. Motion

- [ ] 3.1 Peel, stick, flutter, snap animations with reduced-motion fallbacks; verify visual regression with reduced motion and a performance check (no long tasks > 50 ms on a 60-note board)
