import { describe, expect, it } from 'vitest'
import { hasChosen, showNameAfterTyping } from '../app/utils/show-name'

describe('showNameAfterTyping', () => {
  it('turns on when a name is typed and the person has not chosen yet', () => {
    expect(showNameAfterTyping('Alice', false, false)).toBe(true)
  })
  it('turns off again when the name is cleared', () => {
    expect(showNameAfterTyping('  ', false, true)).toBe(false)
  })
  it('keeps the value once the person touched the checkbox', () => {
    expect(showNameAfterTyping('Alice', true, false)).toBe(false)
    expect(showNameAfterTyping('', true, true)).toBe(true)
  })
})

describe('hasChosen', () => {
  it('is false for a brand new profile and for a dialog left empty', () => {
    expect(hasChosen({ named: false, name: '' })).toBe(false)
    expect(hasChosen({ named: true, name: '' })).toBe(false)
  })
  it('is true when a name was saved after seeing the dialog (even with names hidden)', () => {
    expect(hasChosen({ named: true, name: 'Alice' })).toBe(true)
  })
})
