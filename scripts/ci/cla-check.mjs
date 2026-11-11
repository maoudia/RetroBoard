#!/usr/bin/env node
// The CLA check of an external pull request (docs/CLA.md, change licensing-and-monetization). Signatures are kept in
// signatures/cla.json on the cla-signatures branch of this repository: no third-party app, no secret beyond the Actions token.
// Reads GH_TOKEN, GITHUB_REPOSITORY, PR, COMMENT (the comment that started the run, if any) and COMMENTER from the environment.
import { spawnSync } from 'node:child_process'

export const SIGN_SENTENCE = 'I have read the CLA Document and I hereby sign the CLA'
export const BRANCH = 'cla-signatures'
export const FILE = 'signatures/cla.json'
const MARKER = '<!-- cla-check -->'
/** Members and bots: Claude commits, Dependabot, release-please, GitHub apps. Case-insensitive, `*` matches any run. */
export const ALLOWLIST = ['aoudiamoncef', 'claude', 'anthropic*', 'dependabot*', 'release-please*', 'github-actions*', '*[bot]']

const allowed = (login, list) => list.some((p) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`, 'i').test(login))

/** Who still has to sign: { missing: logins, signed: logins }. Pure. A commit without a GitHub login counts as 'unknown' and stays missing. */
export function decide({ authors, signatures, allowlist = ALLOWLIST }) {
  const signedLogins = new Set((signatures ?? []).map((s) => String(s.name).toLowerCase()))
  const people = [...new Set(authors.map((a) => a || 'unknown'))].filter((a) => !allowed(a, allowlist))
  return { missing: people.filter((p) => !signedLogins.has(p.toLowerCase())), signed: people.filter((p) => signedLogins.has(p.toLowerCase())) }
}

/** The signature sentence, alone on the comment (surrounding blanks ignored). Pure. */
export const isSignature = (comment) => String(comment ?? '').trim() === SIGN_SENTENCE

export function message(missing) {
  return `${MARKER}\nThanks for your contribution. RetroBoard is AGPL-3.0 and also offered under a commercial license, so ${missing.map((m) => `@${m}`).join(', ')} must sign the Contributor License Agreement once ([docs/CLA.md](https://github.com/maoudia/RetroBoard/blob/main/docs/CLA.md), a draft).\n\nTo sign, post this comment exactly:\n\n> ${SIGN_SENTENCE}\n\nComment \`recheck\` to run the check again.`
}

function gh(args, input) {
  const r = spawnSync('gh', ['api', ...args], { input, encoding: 'utf8' })
  return { ok: r.status === 0, out: r.stdout, err: r.stderr }
}
const json = (r) => { try { return JSON.parse(r.out) } catch { return undefined } }

function readSignatures(repo) {
  const r = gh([`repos/${repo}/contents/${FILE}?ref=${BRANCH}`])
  if (!r.ok) return { list: [], sha: undefined, branch: false }
  const f = json(r)
  return { list: JSON.parse(Buffer.from(f.content, 'base64').toString('utf8')).signedContributors ?? [], sha: f.sha, branch: true }
}

function saveSignatures(repo, state, list, who, pr) {
  if (!state.branch) {
    const main = json(gh([`repos/${repo}`]))?.default_branch
    const sha = json(gh([`repos/${repo}/git/ref/heads/${main}`]))?.object?.sha
    if (!gh([`repos/${repo}/git/refs`, '-f', `ref=refs/heads/${BRANCH}`, '-f', `sha=${sha}`]).ok) throw new Error('cannot create the signatures branch')
  }
  const body = { message: `chore(cla): ${who} signs the CLA on pull request #${pr}`, branch: BRANCH, content: Buffer.from(`${JSON.stringify({ signedContributors: list }, null, 2)}\n`).toString('base64'), ...(state.sha ? { sha: state.sha } : {}) }
  if (!gh([`repos/${repo}/contents/${FILE}`, '-X', 'PUT', '--input', '-'], JSON.stringify(body)).ok) throw new Error('cannot store the signature')
}

function main(env) {
  const repo = env.GITHUB_REPOSITORY
  const pr = env.PR
  const pull = json(gh([`repos/${repo}/pulls/${pr}`]))
  const commits = gh([`repos/${repo}/pulls/${pr}/commits`, '--paginate', '--jq', '.[].author.login']).out.split('\n').filter(Boolean)
  const authors = [pull.user.login, ...commits]
  const state = readSignatures(repo)
  let list = state.list
  if (isSignature(env.COMMENT) && authors.some((a) => a?.toLowerCase() === env.COMMENTER?.toLowerCase()) && !list.some((s) => String(s.name).toLowerCase() === env.COMMENTER.toLowerCase())) {
    list = [...list, { name: env.COMMENTER, signedAt: new Date().toISOString(), pullRequest: Number(pr) }]
    saveSignatures(repo, state, list, env.COMMENTER, pr)
  }
  const { missing } = decide({ authors, signatures: list })
  const ok = missing.length === 0
  gh([`repos/${repo}/statuses/${pull.head.sha}`, '-f', `state=${ok ? 'success' : 'failure'}`, '-f', 'context=CLA', '-f', `description=${ok ? 'Every contributor signed the CLA' : `Waiting for the CLA of ${missing.join(', ')}`}`, '-f', `target_url=https://github.com/${repo}/blob/main/docs/CLA.md`])
  const mine = gh([`repos/${repo}/issues/${pr}/comments`, '--paginate', '--jq', `.[] | select(.user.type == "Bot" and (.body | startswith("${MARKER}"))) | .id`]).out.split('\n').filter(Boolean)[0]
  if (!ok) {
    const body = JSON.stringify({ body: message(missing) })
    if (mine) gh([`repos/${repo}/issues/comments/${mine}`, '-X', 'PATCH', '--input', '-'], body)
    else gh([`repos/${repo}/issues/${pr}/comments`, '--input', '-'], body)
  }
  console.log(ok ? 'CLA: every contributor signed or is allowlisted' : `::warning::CLA missing for ${missing.join(', ')}`)
  // The status "CLA" on the head commit is the gate: a run started by a comment belongs to main, not to the pull request.
  return 0
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.env))
