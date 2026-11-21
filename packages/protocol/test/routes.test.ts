import { describe, expect, it } from 'vitest'
import { formatPath, isFormatPath, isPrivatePath, parseIndexing, PRIVATE_PREFIXES } from '../src'

describe('private routes', () => {
  it('covers boards, poker rooms, join links, the check, the offline shell, the dev pages and the storage callback', () => {
    for (const p of ['/boards', '/boards/', '/board', '/poker/room', '/poker/room/', '/check', '/offline', '/dev/service-pages', '/boards.html', '/storage/callback']) expect(isPrivatePath(p), p).toBe(true)
    expect([...PRIVATE_PREFIXES]).toEqual(['/boards', '/board', '/poker/room', '/check', '/offline', '/dev', '/storage'])
  })

  it('leaves the public pages alone, including look-alikes', () => {
    for (const p of ['/', '/new', '/privacy', '/formats/', '/en/formats/starfish/', '/guide/en/', '/poker', '/poker/', '/poker/roomy', '/boardroom', '/checklist', '/devices', '/boardsxhtml', '/boards.html/x', '/boards.htmlx']) expect(isPrivatePath(p), p).toBe(false)
  })
})

describe('indexing switch', () => {
  it('is on only for the exact value public', () => {
    expect(parseIndexing('public')).toBe('public')
    for (const v of ['none', 'PUBLIC', true, 1, null, undefined, '']) expect(parseIndexing(v)).toBe('none')
  })
})

describe('format paths', () => {
  it('has a French path without prefix and an English one under /en, both with a trailing slash', () => {
    expect(formatPath(null, 'fr')).toBe('/formats/')
    expect(formatPath('starfish', 'fr')).toBe('/formats/starfish/')
    expect(formatPath(null, 'en')).toBe('/en/formats/')
    expect(formatPath('starfish', 'en')).toBe('/en/formats/starfish/')
  })

  it('recognises them', () => {
    for (const p of ['/formats', '/formats/', '/formats/daki/', '/en/formats/', '/en/formats/daki/']) expect(isFormatPath(p), p).toBe(true)
    for (const p of ['/', '/format', '/formatsx', '/en', '/fr/formats/']) expect(isFormatPath(p), p).toBe(false)
  })
})
