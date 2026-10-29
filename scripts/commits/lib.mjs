// Conventional Commits 1.0.0 header check (https://www.conventionalcommits.org/en/v1.0.0/).
// Pure functions, no I/O. Used by the commit-msg hook, CI and `pnpm commits:check`.
export const TYPES = ['feat', 'fix', 'perf', 'refactor', 'docs', 'test', 'build', 'ci', 'chore', 'revert', 'style']
export const MAX_HEADER = 120

const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[a-z0-9][a-z0-9._/-]*)\))?(?<bang>!)?: (?<subject>\S.*)$/

/** Messages that git or release tooling generate and that are not written by hand. */
const GENERATED = [/^Merge (branch|pull request|remote-tracking branch) /, /^Revert "/, /^(fixup|squash|amend)! /]

/** Returns an array of problems for a commit message or PR title (empty when valid). */
export function checkMessage(message) {
  const header = String(message).split('\n', 1)[0].trim()
  if (!header) return ['empty commit header']
  if (GENERATED.some((r) => r.test(header))) return []
  const m = HEADER.exec(header)
  if (!m) return [`"${header}" does not match "type(scope): subject" (types: ${TYPES.join(', ')})`]
  const problems = []
  if (!TYPES.includes(m.groups.type)) problems.push(`unknown type "${m.groups.type}" (allowed: ${TYPES.join(', ')})`)
  if (header.length > MAX_HEADER) problems.push(`header is ${header.length} characters, the limit is ${MAX_HEADER}`)
  if (/\.$/.test(m.groups.subject)) problems.push('subject must not end with a period')
  return problems
}

/** Bump a version from the commit messages, mirroring the release rules (used to explain a release). */
export function bumpFor(messages) {
  let level = 'none'
  for (const msg of messages) {
    const header = String(msg).split('\n', 1)[0]
    const m = HEADER.exec(header)
    if (!m) continue
    if (m.groups.bang || /^BREAKING[ -]CHANGE: /m.test(String(msg))) return 'major'
    if (m.groups.type === 'feat') level = 'minor'
    else if ((m.groups.type === 'fix' || m.groups.type === 'perf') && level === 'none') level = 'patch'
  }
  return level
}
