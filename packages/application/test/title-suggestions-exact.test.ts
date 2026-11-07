import { describe, expect, it } from 'vitest'
import { cutOnWord, suggestClusterTitles } from '../src'

describe('cutting a title, exactly', () => {
  it('keeps a text of exactly the limit, and cuts on a word after that', () => {
    expect(cutOnWord('aaaaaa bbb', 10)).toBe('aaaaaa bbb')
    expect(cutOnWord('aaaaaa bbbb', 10)).toBe('aaaaaa')
    expect(cutOnWord('aaaa bbbb', 8)).toBe('aaaa bbb')
    expect(cutOnWord('abcdefghij', 5)).toBe('abcde')
    expect(cutOnWord('ab cdefghij', 5)).toBe('ab cd')
    expect(cutOnWord('aaaaaaa, bbbb', 10)).toBe('aaaaaaa')
  })
})

describe('cluster titles, exactly', () => {
  it('folds plurals only from five letters, never a double s, and recognises x endings', () => {
    expect(suggestClusterTitles(['axis slow', 'axix slow'], 3).slice(0, 2)).toEqual(['Slow', 'Axis'])
    expect(suggestClusterTitles(['boxes here', 'boxe there', 'other thing'], 2)[0]).toBe('Boxes')
    expect(suggestClusterTitles(['tests sont lents', 'test lent'], 3)[0]).toBe('Test lent')
    expect(suggestClusterTitles(['flux slow', 'flu slow', 'fluxe slow'], 3).slice(0, 2)).toEqual(['Slow', 'Flux'])
    expect(suggestClusterTitles(['class here', 'clas here'], 3).slice(0, 2)).toEqual(['Here', 'Class'])
    expect(suggestClusterTitles(['boxes red', 'box blue', 'boxe green'], 3)[0]).toBe('Boxes')
    expect(suggestClusterTitles(['wolves here', 'wolve there'], 3)[0]).toBe('Wolves')
  })

  it('does not pair a word with its own plural', () => {
    expect(suggestClusterTitles(['tests tests alpha', 'test alpha tests'], 3)[0]).not.toBe('Tests tests')
  })

  it('tells two pairs apart whatever the words glued together', () => {
    const titles = suggestClusterTitles(['aaaa bbbbcccc', 'aaaabbbb cccc'], 5)
    expect(titles).not.toContain('Aaaa bbbbcccc')
    expect(titles).not.toContain('Aaaabbbb cccc')
  })

  it('needs a pair in two ideas, and prefers the one written side by side, then the most frequent, then the first seen', () => {
    expect(suggestClusterTitles(['wolf bear', 'deer hawk'], 3)[0]).toBe('Wolf')
    expect(suggestClusterTitles(['wolf deer bear', 'wolf lion bear'], 1)).toEqual(['Wolf bear'])
    // side by side once beats apart three times
    expect(suggestClusterTitles(['deer and hawk', 'deer and hawk', 'deer and hawk', 'wolf bear', 'wolf and bear'], 1)).toEqual(['Wolf bear'])
    // equal adjacency: the one in more ideas
    expect(suggestClusterTitles(['wolf and bear', 'wolf and bear', 'deer and hawk', 'deer and hawk', 'deer and hawk'], 1)).toEqual(['Deer hawk'])
    // equal in everything: the first seen
    expect(suggestClusterTitles(['wolf and bear', 'wolf and bear', 'deer and hawk', 'deer and hawk'], 1)).toEqual(['Wolf bear'])
    expect(suggestClusterTitles(['deer and hawk', 'deer and hawk', 'wolf and bear', 'wolf and bear'], 1)).toEqual(['Deer hawk'])
  })

  it('ranks words by the ideas that hold them, then their count, then first seen', () => {
    expect(suggestClusterTitles(['wolf deer', 'wolf lion', 'deer lion lion'], 3).slice(0, 2)).toEqual(['Lion', 'Wolf'])
    expect(suggestClusterTitles(['deer lion lion', 'wolf lion', 'wolf deer'], 3).slice(0, 2)).toEqual(['Lion', 'Deer'])
    expect(suggestClusterTitles(['hawk lion', 'wolf wolf lion'], 4).slice(0, 3)).toEqual(['Lion', 'Wolf', 'Hawk'])
    expect(suggestClusterTitles(['wolf wolf bear', 'bear lion'], 3).slice(0, 2)).toEqual(['Bear', 'Wolf'])
    expect(suggestClusterTitles(['bear lion', 'wolf wolf bear'], 3).slice(0, 2)).toEqual(['Bear', 'Wolf'])
  })
})
