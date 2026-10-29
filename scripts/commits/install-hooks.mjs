// Points git at .githooks so the commit-msg check runs locally. Silent outside a git checkout.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

if (existsSync('.githooks') && existsSync('.git')) {
  try { execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' }) } catch { /* no git available */ }
}
