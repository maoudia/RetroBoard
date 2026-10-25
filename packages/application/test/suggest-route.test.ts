import { describe, expect, it } from 'vitest'
import { editDistance, suggestRoutes } from '../src'

const ROUTES = ['/', '/new', '/check', '/legal', '/privacy', '/terms', '/accessibility']

describe('edit distance', () => {
  it('counts insert, delete, substitute and neighbour swap as one', () => {
    expect(editDistance('new', 'new')).toBe(0)
    expect(editDistance('nwe', 'new')).toBe(1)
    expect(editDistance('ne', 'new')).toBe(1)
    expect(editDistance('newx', 'new')).toBe(1)
    expect(editDistance('nex', 'new')).toBe(1)
    expect(editDistance('', 'abc')).toBe(3)
  })
})

describe('route suggestions', () => {
  it('suggests the route a typo is closest to', () => {
    expect(suggestRoutes('/nwe', ROUTES)).toEqual(['/new'])
    expect(suggestRoutes('/privcy', ROUTES)).toEqual(['/privacy'])
    expect(suggestRoutes('/chek?x=1#top', ROUTES)).toEqual(['/check'])
    expect(suggestRoutes('/LEGAL/extra', ROUTES)).toEqual([])
  })

  it('stays quiet when nothing is close, for the root and for exact matches', () => {
    expect(suggestRoutes('/zzzzzz', ROUTES)).toEqual([])
    expect(suggestRoutes('/', ROUTES)).toEqual([])
    expect(suggestRoutes('/new', ROUTES)).toEqual([])
  })

  it('is stricter on short names (one slip) than on long ones (two)', () => {
    expect(suggestRoutes('/nxx', ROUTES)).toEqual([])
    expect(suggestRoutes('/prvcy', ROUTES)).toEqual(['/privacy'])
  })

  it('returns at most the requested number, best first', () => {
    expect(suggestRoutes('/lega', ['/legal', '/legacy', '/leg'], 2)).toEqual(['/leg', '/legal'])
  })
})
