# Tasks

## 1. Move a cluster

- [x] 1.1 `group.move` in domain (handler, invariants, locked and unknown column refused), protocol schema and application command; verify unit tests including "invalid move is ignored" and the golden snapshot
- [x] 1.2 Drag a cluster card onto another column (drop zones, ghost, FLIP) and "Move to column..." in the cluster menu; verify e2e on chromium and phone (drag and menu), two participants see the move, axe on the menu

## 2. Better titles

- [ ] 2.1 Golden corpus (at least 20 clusters, fr and en) and the new suggestion rules (phrases, plural folding, 4-letter content words, word-boundary cut); verify the corpus test and that no suggestion is two unrelated words
- [ ] 2.2 Default title from the shortest idea cut on a word boundary (read model only, no stored title); spec delta; verify unit tests and the cluster e2e
