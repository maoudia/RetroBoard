import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { isMutated, undetected } from '../mutation-changed.mjs'

describe('mutation of the changed files', () => {
  it('only looks at what stryker.config.json mutates', () => {
    for (const p of ['packages/domain/src/ideation/handlers.ts', 'packages/application/src/board/history-log.ts', 'packages/sync/src/mesh.ts', 'packages/crypto/src/room.ts', 'packages/exporters/src/report-html.ts', 'packages/protocol/src/envelope.ts']) expect(isMutated(p), p).toBe(true)
    for (const p of ['packages/domain/src/catalogue/templates.ts', 'packages/domain/src/catalogue/templates.en.ts', 'packages/application/src/ports/channel.ts', 'packages/domain/src/index.d.ts', 'packages/domain/test/reducer.test.ts', 'packages/i18n/src/en.ts', 'packages/themes/src/index.ts', 'apps/web/app/utils/invite.ts', 'scripts/quality/prepush.mjs', 'README.md']) expect(isMutated(p), p).toBe(false)
  })

  it('lists the mutants no test detected, in order, and ignores the others', () => {
    const at = (line: number) => ({ start: { line, column: 1 }, end: { line, column: 2 } })
    const report = { files: {
      'b.ts': { mutants: [{ status: 'Killed', mutatorName: 'X', location: at(1) }, { status: 'NoCoverage', mutatorName: 'Y', location: at(9) }] },
      'a.ts': { mutants: [{ status: 'Survived', mutatorName: 'Z', location: at(3) }, { status: 'Timeout', mutatorName: 'T', location: at(4) }, { status: 'Ignored', mutatorName: 'I', location: at(5) }] },
    } }
    expect(undetected(report)).toEqual(['a.ts:3 Z (Survived)', 'b.ts:9 Y (NoCoverage)'])
    expect(undetected({})).toEqual([])
  })
})
