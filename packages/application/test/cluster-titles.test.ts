import { describe, expect, it } from 'vitest'
import { suggestClusterTitles } from '../src'

describe('cluster title suggestions', () => {
  it('puts words shared by several ideas first (fr), without stop words or accents issues', () => {
    const s = suggestClusterTitles(['Les tests sont trop lents', 'Tests lents en CI', 'La CI échoue sur les tests'])
    expect(s[0]).toBe('Tests lents')
    expect(s).toHaveLength(3)
    expect(s.every((x) => !/^(Les|La|Sont)\b/.test(x))).toBe(true)
  })

  it('works in English and ends with the shortest idea', () => {
    const s = suggestClusterTitles(['Deploys are slow on Fridays', 'Slow deploys block the release'])
    expect(s[0]).toBe('Deploys slow')
    expect(s.at(-1)).toBe('Deploys are slow on Fridays')
  })

  it('dedupes, caps and handles empty input', () => {
    expect(suggestClusterTitles([])).toEqual([])
    expect(suggestClusterTitles(['ok'])).toEqual(['ok'])
    expect(suggestClusterTitles(['Pairing', 'pairing'], 3)).toEqual(['Pairing'])
    expect(suggestClusterTitles(['a b c', 'x'.repeat(100)], 2).every((x) => x.length <= 60)).toBe(true)
  })
})
