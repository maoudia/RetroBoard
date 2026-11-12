// Playwright reporter of the nightly run (playwright.config.ts adds it when GITHUB_WORKFLOW is "Nightly").
// A run whose only failures (after the retries) are quarantined specs of tests/e2e/quarantine.json ends green; the other
// reporters still list those failures. Any other failure, or an error outside a test, keeps the run red.
import { readFileSync } from 'node:fs'
import { isQuarantined } from './quarantine.mjs'

export default class QuarantineReporter {
  constructor() {
    this.entries = JSON.parse(readFileSync('tests/e2e/quarantine.json', 'utf8')).entries
    this.errors = 0
  }

  onBegin(_config, suite) {
    this.suite = suite
  }

  onError() {
    this.errors++
  }

  printsToStdio() {
    return false
  }

  onEnd(result) {
    if (result.status !== 'failed' || this.errors) return undefined
    const failed = this.suite.allTests().filter((t) => t.outcome() === 'unexpected')
    const open = failed.filter((t) => !isQuarantined(this.entries, t.location.file, t.parent.project()?.name ?? ''))
    if (!failed.length || open.length) return undefined
    const names = [...new Set(failed.map((t) => `${t.parent.project()?.name} ${t.location.file.split('/').pop()}`))]
    console.log(`Quarantine: ${failed.length} failed test(s) in ${names.join(', ')} do not fail this run (tests/e2e/quarantine.json).`)
    return { status: 'passed' }
  }
}
