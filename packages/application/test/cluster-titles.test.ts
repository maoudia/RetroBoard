import { describe, expect, it } from 'vitest'
import { cutOnWord, suggestClusterTitles } from '../src'

describe('cluster title suggestions', () => {
  it('puts words shared by several ideas first (fr), without stop words or accents issues', () => {
    const s = suggestClusterTitles(['Les tests sont trop lents', 'Tests lents en CI', 'La CI échoue sur les tests'])
    expect(s[0]).toBe('Tests lents')
    expect(s).toHaveLength(3)
    expect(s.every((x) => !/^(Les|La|Sont)\b/.test(x))).toBe(true)
  })

  it('works in English and ends with the shortest idea', () => {
    const s = suggestClusterTitles(['Deploys are slow on Fridays', 'Slow deploys block the release'])
    expect(s[0]).toBe('Slow deploys')
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
    // Full tie: reading order (words of 4 letters or more only).
    expect(suggestClusterTitles(['four five six'])).toEqual(['Four', 'Five', 'four five six'])
    expect(suggestClusterTitles(['one two three'])).toEqual(['Three', 'one two three'])
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

describe('cluster title rules (clusters-v2)', () => {
  it('folds plurals so "test" and "tests" count together', () => {
    expect(suggestClusterTitles(['Un test lent', 'Des tests flaky'])[0]).toBe('Test')
    expect(suggestClusterTitles(['Slow deploy', 'Slow deploys', 'Deploys fail'])[0]).toBe('Slow deploy')
    // "ss" endings are not plurals.
    expect(suggestClusterTitles(['Missing access', 'Access denied'])[0]).toBe('Access')
  })

  it('suggests a pair only when both words go together in at least two ideas', () => {
    // alpha and gamma are each shared, but never in the same idea twice: no pair.
    expect(suggestClusterTitles(['alpha beta', 'alpha gamma', 'gamma delta'])[0]).toBe('Alpha')
    // Phrases (adjacent words) win over words that merely co-occur.
    expect(suggestClusterTitles(['code review slow', 'review code later', 'code review late', 'slow code review'])[0]).toBe('Code review')
  })

  it('ignores words shorter than 4 letters', () => {
    expect(suggestClusterTitles(['bug CI', 'bug CI'])).toEqual(['bug CI'])
  })

  it('keeps reading order between equally good phrases and never pairs a word with itself', () => {
    expect(suggestClusterTitles(['alpha beta gamma', 'alpha beta gamma'])[0]).toBe('Alpha beta')
    expect(suggestClusterTitles(['tests tests', 'tests']).some((x) => /^tests tests$/i.test(x) && x[0] === 'T')).toBe(false)
  })

  it('keeps four-letter words as they are and folds only longer plurals', () => {
    // "docs" (4 letters) is left alone, "tests" (5) is folded.
    expect(suggestClusterTitles(['docs tests', 'doc test']).length).toBeGreaterThan(0)
    expect(suggestClusterTitles(['tests lents', 'test lent'])[0]).toBe('Tests lents')
    expect(suggestClusterTitles(['docs plus', 'doc plus'])[0]).toBe('Docs')
  })

  it('cuts on a word boundary without a trailing separator', () => {
    expect(cutOnWord('exact', 5)).toBe('exact')
    expect(cutOnWord('abcd efghij', 10)).toBe('abcd efghi')
    expect(cutOnWord('abcde fghijk', 10)).toBe('abcde fghi')
    expect(cutOnWord('abcdef ghijkl', 10)).toBe('abcdef')
    expect(cutOnWord('one two,; three four', 9)).toBe('one two')
    expect(cutOnWord('one two - three four', 10)).toBe('one two')
    expect(cutOnWord('short', 40)).toBe('short')
    expect(cutOnWord('  padded  ', 40)).toBe('padded')
    expect(cutOnWord('one two three four five', 14)).toBe('one two three')
    expect(cutOnWord('one two, three four', 8)).toBe('one two')
    expect(cutOnWord('Supercalifragilisticexpialidocious', 10)).toBe('Supercalif')
    expect(cutOnWord('ab cdefghijklmnop', 10)).toBe('ab cdefghi')
  })
})

/** Golden corpus: real-like clusters, the title a facilitator would accept as first suggestion. */
const CORPUS: [string, string[], string][] = [
  ['fr', ['Les tests sont trop lents', 'Tests lents en CI', 'La CI échoue sur les tests'], 'Tests lents'],
  ['fr', ['Déploiement le vendredi soir', 'Pas de déploiement le vendredi', 'Vendredi: gel des déploiements'], 'Déploiement vendredi'],
  ['fr', ['Revue de code trop longue', 'Les revues de code traînent', 'Attente de la revue'], 'Revue code'],
  ['fr', ['Réunions trop nombreuses', 'Trop de réunions le lundi'], 'Réunions'],
  ['fr', ['Documentation obsolète', 'La doc est périmée', 'Documentation à refaire'], 'Documentation'],
  ['fr', ['Astreinte difficile la nuit', "L'astreinte réveille trop souvent"], 'Astreinte'],
  ['fr', ['Bonne ambiance dans équipe', 'Super ambiance en équipe'], 'Ambiance équipe'],
  ['fr', ['Monitoring insuffisant', 'Alertes bruyantes', 'Peu de monitoring en production'], 'Monitoring'],
  ['fr', ['Pair programming efficace', 'Le pair programming aide les juniors'], 'Pair programming'],
  ['fr', ['Priorités changent chaque semaine', 'Changement de priorités permanent'], 'Priorités'],
  ['fr', ['Support client lent', 'Tickets support en retard'], 'Support'],
  ['en', ['Deploys are slow on Fridays', 'Slow deploys block the release'], 'Slow deploys'],
  ['en', ['Too many meetings', 'Meetings without agenda', 'Meeting overload on Monday'], 'Meetings'],
  ['en', ['Code review takes days', 'Waiting for code review', 'Review queue is long'], 'Code review'],
  ['en', ['Flaky tests in CI', 'CI fails on flaky tests'], 'Flaky tests'],
  ['en', ['Great team spirit', 'Team spirit is strong'], 'Team spirit'],
  ['en', ['Unclear requirements', 'Requirements change late', 'Requirement gaps found in QA'], 'Requirements'],
  ['en', ['On-call is exhausting', 'Too many pages at night', 'Night pages wake us up'], 'Night pages'],
  ['en', ['Documentation is outdated', 'Update the docs', 'Outdated documentation again'], 'Outdated documentation'],
  ['en', ['Pairing sessions help onboarding', 'Onboarding needs pairing'], 'Pairing onboarding'],
  ['en', ['Staging is unstable', 'Staging environment broken again', 'Unstable staging data'], 'Unstable staging'],
]

describe('title suggestion golden corpus', () => {
  it('has at least 20 clusters in both languages', () => {
    expect(CORPUS.length).toBeGreaterThanOrEqual(20)
    expect(new Set(CORPUS.map(([lang]) => lang))).toEqual(new Set(['fr', 'en']))
  })

  it.each(CORPUS)('%s: %j', (_lang, ideas, expected) => {
    const s = suggestClusterTitles(ideas)
    expect(s[0]).toBe(expected)
    // Never two unrelated words: a two-word suggestion is a pair that goes together in at least two ideas.
    for (const title of s.slice(0, -1).filter((t) => t.split(' ').length === 2)) {
      const [a, b] = title.toLowerCase().split(' ') as [string, string]
      const stem = (w: string) => w.normalize('NFD').replace(/\p{M}/gu, '').replace(/s$/, '')
      const together = ideas.filter((i) => stem(i.toLowerCase()).includes(stem(a).slice(0, 4)) && stem(i.toLowerCase()).includes(stem(b).slice(0, 4))).length
      expect(together).toBeGreaterThanOrEqual(2)
    }
    expect(s.length).toBeLessThanOrEqual(3)
  })
})
