import { describe, expect, it } from 'vitest'
import { templateMapping } from '../src'

describe('template mapping preview', () => {
  it('maps by position and collapses extra old columns into the last new one', () => {
    expect(templateMapping(['Went well', 'Went wrong', 'Ideas', 'Actions'], ['Keep', 'Change', 'Try'])).toEqual([
      { to: 'Keep', from: ['Went well'] },
      { to: 'Change', from: ['Went wrong'] },
      { to: 'Try', from: ['Ideas', 'Actions'] },
    ])
  })

  it('leaves extra new columns empty when the new format has more columns', () => {
    expect(templateMapping(['A', 'B'], ['X', 'Y', 'Z'])).toEqual([{ to: 'X', from: ['A'] }, { to: 'Y', from: ['B'] }, { to: 'Z', from: [] }])
  })

  it('has no rows without new columns', () => {
    expect(templateMapping(['A'], [])).toEqual([])
  })
})
