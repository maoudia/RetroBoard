import { LIMITS } from '@retroboard/domain'
import { describe, expect, it } from 'vitest'
import {
  actionsFromCsv, actionsFromJson, addTeam, assignBoard, carryOver, currentTeam, EMPTY_WORKSPACE, mapStatus, MAX_RETROS_PER_TEAM, nextTitle, parseCsv, projectsOf, rememberOwner, saveRetro,
  suggestOwners, TEAM_COLORS, TEAM_EMOJIS, type SavedRetro, type Workspace,
} from '../src'

describe('owner suggestions, exactly', () => {
  it('keeps room for the typed text only when something was typed', () => {
    const names = ['Ann', 'Anna', 'Annie', 'Anne']
    expect(suggestOwners('an', names, [], 3).map((s) => s.name)).toEqual(['Ann', 'Anna', 'an'])
    expect(suggestOwners('', names, [], 3).map((s) => s.name)).toEqual(['Ann', 'Anna', 'Annie'])
    expect(suggestOwners('   ', names, [], 3).map((s) => s.name)).toEqual(['Ann', 'Anna', 'Annie'])
  })
})

describe('status words, exactly', () => {
  const table: Record<string, string[]> = {
    todo: ['todo', 'to do', 'open', 'backlog', 'a faire', 'ouvert', 'new'],
    doing: ['doing', 'in progress', 'en cours', 'started', 'in review'],
    done: ['done', 'closed', 'resolved', 'termine', 'fait', 'complete', 'completed'],
    blocked: ['blocked', 'bloque', 'on hold', 'waiting'],
    dropped: ['dropped', "won't do", 'wont do', 'abandonne', 'cancelled', 'canceled', 'rejected'],
  }
  it('knows every word of every status, in any case and with accents', () => {
    for (const [status, words] of Object.entries(table)) {
      for (const w of words) {
        expect(mapStatus(w), w).toBe(status)
        expect(mapStatus(`  ${w.toUpperCase()} `), w).toBe(status)
      }
    }
    expect(mapStatus('Terminé')).toBe('done')
    expect(mapStatus('À faire')).toBe('todo')
    expect(mapStatus('Bloqué')).toBe('blocked')
  })
  it('falls back to to do for anything else, nothing or blank', () => {
    for (const v of ['whatever', '', '   ', undefined, null]) expect(mapStatus(v)).toBe('todo')
  })
})

describe('CSV, exactly', () => {
  it('reads quotes, doubled quotes, newlines in quotes, both separators and every line ending', () => {
    expect(parseCsv('a,b\r\nc,d\r\n')).toEqual([['a', 'b'], ['c', 'd']])
    expect(parseCsv('a;b\rc;d')).toEqual([['a', 'b'], ['c', 'd']])
    expect(parseCsv('"x ""y"" z","l1\nl2",k')).toEqual([['x "y" z', 'l1\nl2', 'k']])
  })
  it('keeps the last row without a final newline, a single value, and an empty last field', () => {
    expect(parseCsv('a,b')).toEqual([['a', 'b']])
    expect(parseCsv('a')).toEqual([['a']])
    expect(parseCsv('a,')).toEqual([['a', '']])
    expect(parseCsv('a,b\n')).toEqual([['a', 'b']])
  })
  it('drops blank rows and a byte order mark at the start only', () => {
    expect(parseCsv('a, \n , \n\nb,c')).toEqual([['a', ' '], ['b', 'c']])
    expect(parseCsv('﻿a,b')).toEqual([['a', 'b']])
    expect(parseCsv('a﻿b,c')).toEqual([['a﻿b', 'c']])
    expect(parseCsv('')).toEqual([])
  })
})

describe('importing actions, exactly', () => {
  const csv = (header: string, row: string, o = {}) => actionsFromCsv(`${header}\n${row}`, o)
  it('finds the columns by every known header name', () => {
    for (const h of ['summary', 'action', 'actions', 'text', 'titre', 'resume', 'title']) expect(csv(h, 'Fix it'), h).toEqual([{ text: 'Fix it', owner: '', status: 'todo' }])
    for (const h of ['assignee', 'owner', 'responsable', 'porteur', 'who']) expect(csv(`text,${h}`, 'Fix,Ann'), h).toEqual([{ text: 'Fix', owner: 'Ann', status: 'todo' }])
    for (const h of ['status', 'statut', 'state', 'etat']) expect(csv(`text,${h}`, 'Fix,done'), h).toEqual([{ text: 'Fix', owner: '', status: 'done' }])
    for (const h of ['due date', 'due', 'echeance', 'deadline']) expect(csv(`text,${h}`, 'Fix,2027-02-03'), h).toEqual([{ text: 'Fix', owner: '', status: 'todo', due: '2027-02-03' }])
    expect(csv('Résumé, ÉTAT', 'Fix, fait')).toEqual([{ text: 'Fix', owner: '', status: 'done' }])
    expect(actionsFromCsv('a,b\n1,2')).toBeNull()
    expect(actionsFromCsv('')).toBeNull()
  })

  it('removes the apostrophe that protects formulas, only at the start, and trims', () => {
    expect(csv('text,owner', "'=SUM(A1),'@bob ")).toEqual([{ text: '=SUM(A1)', owner: '@bob', status: 'todo' }])
    expect(csv('text,owner', "a'=b,x'-y")).toEqual([{ text: "a'=b", owner: "x'-y", status: 'todo' }])
    expect(csv('text,owner', "'abc,'x")).toEqual([{ text: "'abc", owner: "'x", status: 'todo' }])
    expect(csv('text,owner', "  spaced  ,  Ann  ")).toEqual([{ text: 'spaced', owner: 'Ann', status: 'todo' }])
    expect(csv('text,owner', "' =x,y")).toEqual([{ text: "' =x", owner: 'y', status: 'todo' }])
  })

  it('cuts the text, the owner and the origin to their limits, and checks the date', () => {
    const long = (n: number) => 'x'.repeat(n + 10)
    const [a] = csv('text,owner', `${long(LIMITS.actionText)},${long(LIMITS.actionOwner)}`, { from: long(LIMITS.boardTitle) })!
    expect(a!.text).toHaveLength(LIMITS.actionText)
    expect(a!.owner).toHaveLength(LIMITS.actionOwner)
    expect(a!.from).toHaveLength(LIMITS.boardTitle)
    for (const bad of ['soon', '2027-1-1', '27-01-01', '20270101', '2027-01-0x']) expect(csv('text,due', `Fix,${bad}`)![0], bad).not.toHaveProperty('due')
    expect(csv('text,due', 'Fix, 2027-02-03 ')![0]).toHaveProperty('due', '2027-02-03')
    expect(csv('text,due', 'Fix,2027-02-03T10:00')![0]).toHaveProperty('due', '2027-02-03')
    expect(csv('text,due', 'Fix,')![0]).not.toHaveProperty('due')
    expect(csv('text', 'Fix')![0]).not.toHaveProperty('from')
    expect(csv('text', 'Fix', { from: 'Sprint' })![0]).toHaveProperty('from', 'Sprint')
  })

  it('reads short rows, drops lines without text, keeps open actions on request, and at most the import limit', () => {
    expect(actionsFromCsv('text,owner,status,due\nFix')).toEqual([{ text: 'Fix', owner: '', status: 'todo' }])
    expect(actionsFromCsv('a,b,text\nonly')).toEqual([])
    expect(actionsFromCsv('text,owner\n,Ann\nKeep,Bob')).toEqual([{ text: 'Keep', owner: 'Bob', status: 'todo' }])
    const rows = ['todo', 'doing', 'done', 'blocked', 'dropped'].map((s) => `A ${s},${s}`).join('\n')
    expect(actionsFromCsv(`text,status\n${rows}`, { openOnly: true })!.map((a) => a.status)).toEqual(['todo', 'doing', 'blocked'])
    expect(actionsFromCsv(`text,status\n${rows}`)).toHaveLength(5)
    const many = Array.from({ length: LIMITS.maxImport + 4 }, (_, i) => `a${i}`).join('\n')
    expect(actionsFromCsv(`text\n${many}`)).toHaveLength(LIMITS.maxImport)
  })

  it('reads our JSON export, a bare array, and nothing else', () => {
    expect(actionsFromJson('not json')).toBeNull()
    expect(actionsFromJson('null')).toBeNull()
    expect(actionsFromJson('5')).toBeNull()
    expect(actionsFromJson('{"actions":"x"}')).toBeNull()
    expect(actionsFromJson('[]')).toEqual([])
    const doc = JSON.stringify({ settings: { title: 'Sprint 3' }, actions: [{ text: 'A', owner: 'Ann', status: 'blocked', due: '2027-01-01' }, { text: 'B', done: true }, { text: 'C', done: false }, { text: 'D', status: 'done', done: false }, { text: 5 }, null, { text: 'E', owner: 5, due: 7 }] })
    expect(actionsFromJson(doc)).toEqual([
      { text: 'A', owner: 'Ann', status: 'blocked', due: '2027-01-01', from: 'Sprint 3' },
      { text: 'B', owner: '', status: 'done', from: 'Sprint 3' },
      { text: 'C', owner: '', status: 'todo', from: 'Sprint 3' },
      { text: 'D', owner: '', status: 'done', from: 'Sprint 3' },
      { text: 'E', owner: '', status: 'todo', from: 'Sprint 3' },
    ])
    expect(actionsFromJson(doc, { from: 'Other' })![0]).toHaveProperty('from', 'Other')
    expect(actionsFromJson('[{"text":"A"}]')).toEqual([{ text: 'A', owner: '', status: 'todo' }])
    expect(actionsFromJson('{"settings":{"title":5},"actions":[{"text":"A"}]}')).toEqual([{ text: 'A', owner: '', status: 'todo' }])
    expect(actionsFromJson('{"actions":[{"text":"A","status":"done"},{"text":"B"}]}', { openOnly: true })).toEqual([{ text: 'B', owner: '', status: 'todo' }])
  })
})

describe('workspaces, exactly', () => {
  const ws = (over: Partial<Workspace> = {}): Workspace => ({ ...EMPTY_WORKSPACE, ...over })
  const retro = (boardId: string, teamId: string, at: number, over: Partial<SavedRetro> = {}): SavedRetro => ({ boardId, teamId, project: null, title: `Retro ${at}`, at, actions: [], ...over })

  it('starts empty, with its own lists', () => {
    expect(EMPTY_WORKSPACE).toStrictEqual({ teams: [], lastTeamId: null, retros: [], boards: {}, owners: [] })
  })

  it('names a team, trims and cuts it, falls back to Team, and cycles emoji and colour', () => {
    let w = ws()
    const names: string[] = []
    for (let i = 0; i < TEAM_EMOJIS.length + 1; i++) {
      const r = addTeam(w, i === 0 ? `  ${'n'.repeat(50)}  ` : i === 1 ? '   ' : `T${i}`, `id${i}`)
      w = r.ws
      names.push(r.team.name)
      expect(r.team.emoji).toBe(TEAM_EMOJIS[i % TEAM_EMOJIS.length])
      expect(r.team.color).toBe(TEAM_COLORS[i % TEAM_COLORS.length])
      expect(w.lastTeamId).toBe(`id${i}`)
    }
    expect(names[0]).toBe('n'.repeat(40))
    expect(names[1]).toBe('Team')
    expect(w.teams).toHaveLength(TEAM_EMOJIS.length + 1)
    expect(w.teams.at(-1)!.emoji).toBe(TEAM_EMOJIS[0])
  })

  it('picks the last team used, else the first, else none', () => {
    const teams = [{ id: 'a', name: 'A', emoji: '', color: '' }, { id: 'b', name: 'B', emoji: '', color: '' }]
    expect(currentTeam(ws({ teams, lastTeamId: 'b' }))!.id).toBe('b')
    expect(currentTeam(ws({ teams, lastTeamId: 'zz' }))!.id).toBe('a')
    expect(currentTeam(ws())).toBeNull()
  })

  it('lists the projects of one team, once each, in alphabetical order', () => {
    const w = ws({ retros: [retro('1', 't', 1, { project: 'Zed' }), retro('2', 't', 2, { project: 'Alpha' }), retro('3', 't', 3, { project: 'Zed' }), retro('4', 't', 4), retro('5', 'u', 5, { project: 'Other' })] })
    expect(projectsOf(w, 't')).toEqual(['Alpha', 'Zed'])
    expect(projectsOf(w, 'x')).toEqual([])
  })

  it('assigns a board to a team and a trimmed project, or none', () => {
    const w = assignBoard(ws({ boards: { old: { teamId: 'a', project: null } } }), 'b1', 't', '  P  ')
    expect(w).toMatchObject({ lastTeamId: 't', boards: { old: { teamId: 'a', project: null }, b1: { teamId: 't', project: 'P' } } })
    expect(assignBoard(ws(), 'b1', 't', '   ').boards.b1).toStrictEqual({ teamId: 't', project: null })
    expect(assignBoard(ws(), 'b1', 't', null).boards.b1).toStrictEqual({ teamId: 't', project: null })
  })

  it('remembers an owner first, once whatever the case, ignores blanks, and keeps forty', () => {
    const w = rememberOwner(rememberOwner(ws({ owners: ['Bob', 'ann'] }), '  Ann '), 'Carl')
    expect(w.owners).toEqual(['Carl', 'Ann', 'Bob'])
    const same = ws({ owners: ['x'] })
    expect(rememberOwner(same, '   ')).toBe(same)
    expect(rememberOwner(ws({ owners: ['Ann'] }), 'ANN').owners).toEqual(['ANN'])
    const forty = Array.from({ length: 40 }, (_, i) => `o${i}`)
    const full = rememberOwner(ws({ owners: forty }), 'new')
    expect(full.owners).toHaveLength(40)
    expect(full.owners[0]).toBe('new')
    expect(full.owners.at(-1)).toBe('o38')
  })

  it('saves a retro in place of the same board, keeping the newest ones of its team and leaving other teams alone', () => {
    let w = ws({ retros: [retro('other', 'u', 1)] })
    for (let i = 1; i <= MAX_RETROS_PER_TEAM + 3; i++) w = saveRetro(w, retro(`b${i}`, 't', i * 10))
    const mine = w.retros.filter((r) => r.teamId === 't')
    expect(mine).toHaveLength(MAX_RETROS_PER_TEAM)
    expect(Math.min(...mine.map((r) => r.at))).toBe(40)
    expect(w.retros.filter((r) => r.boardId === 'other')).toHaveLength(1)
    expect(w.retros).toHaveLength(MAX_RETROS_PER_TEAM + 1)
    const again = saveRetro(w, retro('b15', 't', 500, { title: 'Again' }))
    expect(again.retros.filter((r) => r.boardId === 'b15')).toEqual([retro('b15', 't', 500, { title: 'Again' })])
    expect(again.retros.filter((r) => r.teamId === 't')).toHaveLength(MAX_RETROS_PER_TEAM)
    const old = saveRetro(w, retro('late', 't', 1))
    expect(old.retros.some((r) => r.boardId === 'late')).toBe(false)
  })

  it('carries over the open actions of one team, newest retro first, once each, narrowed by project', () => {
    const a = (text: string, owner: string, status = 'todo') => ({ text, owner, status })
    const w = ws({ retros: [
      retro('1', 't', 10, { title: 'Old', project: 'P', actions: [a('Fix CI', 'Ann'), a('Done one', 'Ann', 'done'), a('Drop', 'Ann', 'dropped'), a('Wait', 'Bob', 'blocked')] }),
      retro('2', 't', 20, { title: 'New', actions: [a(' fix ci ', ' ann ', 'doing'), a('Other', '')] }),
      retro('3', 'u', 30, { title: 'Elsewhere', actions: [a('Not mine', '')] }),
    ] })
    const all = carryOver(w, 't')
    expect(all.map((c) => [c.text, c.from, c.at, c.project, c.status])).toEqual([[' fix ci ', 'New', 20, null, 'doing'], ['Other', 'New', 20, null, 'todo'], ['Wait', 'Old', 10, 'P', 'blocked']])
    expect(carryOver(w, 't', 'P').map((c) => c.text)).toEqual(['Fix CI', 'Wait'])
    expect(carryOver(w, 't', null)).toHaveLength(3)
    expect(carryOver(w, 'none')).toEqual([])
    const sameText = ws({ retros: [retro('1', 't', 10, { actions: [a('Fix', 'Ann'), a('Fix', 'Bob')] })] })
    expect(carryOver(sameText, 't')).toHaveLength(2)
    const doneFirst = ws({ retros: [retro('1', 't', 10, { actions: [a('Fix', 'Ann')] }), retro('2', 't', 20, { actions: [a('fix', 'ann', 'done')] })] })
    expect(carryOver(doneFirst, 't')).toEqual([])
  })

  it('suggests the next title by counting up the last number of the latest retro', () => {
    const next = (title: string, at = 1) => nextTitle(ws({ retros: [retro('1', 't', at, { title })] }), 't')
    expect(next('Sprint 42')).toBe('Sprint 43')
    expect(next('  Sprint 9  ')).toBe('Sprint 10')
    expect(next('Retro 99 bis')).toBe('Retro 100 bis')
    expect(next('Sprint 3 and 4')).toBe('Sprint 3 and 5')
    expect(next('Sprint 12 - team')).toBe('Sprint 13 - team')
    expect(next('7')).toBe('8')
    expect(next('Sprint 007')).toBe('Sprint 8')
    expect(next('No number')).toBeNull()
    expect(nextTitle(ws(), 't')).toBeNull()
    expect(nextTitle(ws({ retros: [retro('1', 't', 5, { title: 'Sprint 1' }), retro('2', 't', 9, { title: 'Sprint 5' }), retro('3', 'u', 99, { title: 'Sprint 50' })] }), 't')).toBe('Sprint 6')
  })
})
