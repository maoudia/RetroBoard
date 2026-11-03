import { readFileSync } from 'node:fs'
import { buildSnapshot } from '@retroboard/domain'
import { alice, harness } from '@retroboard/testkit'
import Ajv2020 from 'ajv/dist/2020'
import { describe, expect, it } from 'vitest'
import { toJson } from '../src'

const schema = JSON.parse(readFileSync(new URL('../schema/retro-export.schema.json', import.meta.url), 'utf8')) as object
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema)

function board() {
  const h = harness()
  const col = h.state.columns[0]!.id
  h.run({ t: 'note.add', columnId: col, text: 'Slow CI', color: 17 })
  h.run({ t: 'action.add', text: 'Cache deps', owner: 'Bob' })
  h.run({ t: 'vote.toggle', id: Object.keys(h.state.notes)[0]! })
  return buildSnapshot(h.state, { cid: alice.cid }, [], h.now)
}

describe('published JSON Schema of the JSON export (packages/exporters/schema/retro-export.schema.json)', () => {
  it('accepts what the exporter writes, including an advanced-palette colour', () => {
    const doc = JSON.parse(toJson(board())) as unknown
    expect(validate(doc), JSON.stringify(validate.errors)).toBe(true)
  })

  it('refuses per-viewer fields, unknown statuses and colours outside the palette', () => {
    const doc = JSON.parse(toJson(board())) as { notes: Record<string, unknown>[]; actions: Record<string, unknown>[] }
    expect(validate({ ...doc, notes: [{ ...doc.notes[0], mine: true }] })).toBe(false)
    expect(validate({ ...doc, notes: [{ ...doc.notes[0], color: 24 }] })).toBe(false)
    expect(validate({ ...doc, actions: [{ ...doc.actions[0], status: 'later' }] })).toBe(false)
    expect(validate({ settings: doc, columns: [], notes: [], groups: [], actions: [] })).toBe(false)
  })
})
