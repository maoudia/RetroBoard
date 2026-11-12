import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { isQuarantined, problems } from '../quarantine.mjs'
// @ts-expect-error plain ESM script without types
import QuarantineReporter from '../quarantine-reporter.mjs'

const entry = (over = {}) => ({ spec: 'toolbar-fold.spec.ts', projects: ['*'], reason: 'fails on the slow runner, fix the timing then remove', ...over })

describe('nightly quarantine list', () => {
  it('matches a spec file in the listed projects only', () => {
    const list = [entry({ projects: ['phone'] }), entry({ spec: 'keyboard.spec.ts' })]
    expect(isQuarantined(list, '/repo/tests/e2e/toolbar-fold.spec.ts', 'phone')).toBe(true)
    expect(isQuarantined(list, '/repo/tests/e2e/toolbar-fold.spec.ts', 'firefox')).toBe(false)
    expect(isQuarantined(list, '/repo/tests/e2e/keyboard.spec.ts', 'firefox')).toBe(true)
    expect(isQuarantined(list, '/repo/tests/e2e/other-keyboard.spec.ts', 'firefox')).toBe(false)
    expect(isQuarantined(list, 'C:\\repo\\tests\\e2e\\keyboard.spec.ts', 'tv')).toBe(true)
  })

  it('accepts a sound list', () => {
    expect(problems([entry(), entry({ spec: 'keyboard.spec.ts', projects: ['chromium', 'webkit'] })], () => true)).toEqual([])
  })

  it('names every defect', () => {
    expect(problems([entry({ spec: 'gone.spec.ts' })], () => false)).toEqual([expect.stringContaining('does not exist')])
    expect(problems([entry({ spec: '../x.ts' })], () => true)).toEqual([expect.stringContaining('file name')])
    expect(problems([entry(), entry()], () => true)).toEqual([expect.stringContaining('listed twice')])
    expect(problems([entry({ projects: [] })], () => true)).toEqual([expect.stringContaining('"projects"')])
    expect(problems([entry({ projects: ['ie11'] })], () => true)).toEqual([expect.stringContaining('"projects"')])
    expect(problems([entry({ reason: 'flaky' })], () => true)).toEqual([expect.stringContaining('"reason"')])
    expect(problems([{ spec: 'a.spec.ts', projects: '*' }], () => true).length).toBe(2)
  })
})

describe('quarantine reporter', () => {
  const test = (file: string, project: string, outcome: string) => ({ outcome: () => outcome, location: { file }, parent: { project: () => ({ name: project }) } })
  const run = (tests: ReturnType<typeof test>[], status = 'failed', errors = 0) => {
    const reporter = new QuarantineReporter()
    reporter.onBegin({}, { allTests: () => tests })
    for (let i = 0; i < errors; i++) reporter.onError()
    return reporter.onEnd({ status })
  }
  // The first spec of tests/e2e/quarantine.json, in every project.
  const listed = '/repo/tests/e2e/toolbar-fold.spec.ts'

  it('turns a run whose only failures are quarantined into a pass', () => {
    expect(run([test(listed, 'phone', 'unexpected'), test('/repo/tests/e2e/board.spec.ts', 'phone', 'expected')])).toEqual({ status: 'passed' })
  })

  it('keeps the run red for any other failure, error or status', () => {
    expect(run([test(listed, 'phone', 'unexpected'), test('/repo/tests/e2e/board.spec.ts', 'phone', 'unexpected')])).toBeUndefined()
    expect(run([test(listed, 'phone', 'unexpected')], 'failed', 1)).toBeUndefined()
    expect(run([test(listed, 'phone', 'unexpected')], 'timedout')).toBeUndefined()
    expect(run([], 'failed')).toBeUndefined()
    expect(new QuarantineReporter().printsToStdio()).toBe(false)
  })
})
