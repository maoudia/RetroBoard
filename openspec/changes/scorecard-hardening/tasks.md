# Tasks

## 1. Pinned build inputs

- [ ] 1.1 `docker/runtime/package.json` and `package-lock.json` for Wrangler, a unit test that the version equals `wrangler.version`, Dockerfile `npm ci --omit=dev --ignore-scripts` and digests on both `FROM` lines; Dependabot `docker` and the second `npm` directory; verify `pnpm verify`, `actionlint`, image job and Trivy green in CI

## 2. Review that counts

- [ ] 2.1 `Agent review` workflow: approve or request changes from the spec gate, code-scanning alerts, scanner comments and author check; enable "Allow GitHub Actions to create and approve pull requests"; verify on a clean and on a deliberately flagged pull request
- [ ] 2.2 Ruleset: one required approval, code-owner review, no bypass actors; update `docs/runbooks/repo-settings.md`; verify the release pull request and an agent pull request still auto-merge
- [ ] 2.3 Skill and AGENTS.md: the review gate and what it does not replace

## 3. Signed releases

- [ ] 3.1 Release workflow: static archive, SBOM, `cosign sign-blob --bundle`, provenance, `gh release upload`; `docs/self-hosting.md` verification command; verify on the next release (assets present, `cosign verify-blob` passes)

## 4. Badge and score

- [ ] 4.1 `docs/security/best-practices.md` criteria checklist; owner registers on bestpractices.dev; README badge
- [ ] 4.2 `scorecard.yml` `checks: read`; re-read the score on the new head; `docs/quality.md` records the score, the checks we cannot move and the date
