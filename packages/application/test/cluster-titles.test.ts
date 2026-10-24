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

  it('ranks by how many ideas share a word, then by count, then by first appearance', () => {
    // beta is in two ideas, alpha is repeated in one: sharing wins.
    expect(suggestClusterTitles(['alpha alpha alpha', 'beta xyz', 'beta qrs'])).toEqual(['Beta', 'Alpha', 'beta xyz'])
    // Same spread: the repeated word wins over the earlier one.
    expect(suggestClusterTitles(['delta gamma gamma', 'zeta'])).toEqual(['Gamma', 'Delta', 'zeta'])
    // Full tie: reading order.
    expect(suggestClusterTitles(['one two three'])).toEqual(['One', 'Two', 'one two three'])
    // Words seen in only one idea never form the "shared" pair.
    expect(suggestClusterTitles(['alpha beta', 'gamma'])).toEqual(['Alpha', 'Beta', 'gamma'])
  })

  it('merges accented and plain spellings of a word', () => {
    expect(suggestClusterTitles(['alpha déploiement', 'deploiement beta'])[0]).toBe('Déploiement')
  })

  it('ignores blank ideas and trims the shortest one; never invents words', () => {
    expect(suggestClusterTitles(['   ', 'Tests lents ici'])).toEqual(['Tests', 'Lents', 'Tests lents ici'])
    expect(suggestClusterTitles([' Pipeline KO '])).toEqual(['Pipeline', 'Pipeline KO'])
    expect(suggestClusterTitles(['!!!'])).toEqual(['!!!'])
  })

  it('never returns more than asked', () => {
    expect(suggestClusterTitles(['alpha beta one', 'beta alpha two'], 1)).toEqual(['Alpha beta'])
  })
})
