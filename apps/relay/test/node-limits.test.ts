import { describe, expect, it } from 'vitest'
import { AddressBook, DEFAULT_IDLE, idleAction, MAX_BUFFERED_BYTES, overBudget } from '../src/adapters/node-limits'

describe('AddressBook', () => {
  it('caps the sockets open from one address and frees a place on release', () => {
    const book = new AddressBook(2, 0)
    expect(book.admit('a', 0)).toBe('ok')
    expect(book.admit('a', 1)).toBe('ok')
    expect(book.admit('a', 2)).toBe('full')
    expect(book.admit('b', 2)).toBe('ok')
    book.release('a')
    expect(book.admit('a', 3)).toBe('ok')
  })

  it('limits connection attempts per window, per address, and forgets them after the window', () => {
    const book = new AddressBook(0, 3, 1000)
    for (const t of [0, 100, 200]) expect(book.admit('a', t)).toBe('ok')
    expect(book.admit('a', 300)).toBe('rate')
    expect(book.admit('b', 300)).toBe('ok')
    expect(book.admit('a', 1100)).toBe('ok')
  })

  it('counts an attempt that was refused for the cap as nothing, so a refused client is not locked out longer', () => {
    const book = new AddressBook(1, 2, 1000)
    expect(book.admit('a', 0)).toBe('ok')
    expect(book.admit('a', 10)).toBe('full')
    expect(book.admit('a', 20)).toBe('full')
    book.release('a')
    expect(book.admit('a', 30)).toBe('ok')
    book.release('a')
    expect(book.admit('a', 40)).toBe('rate')
  })

  it('turns a limit off with 0', () => {
    const book = new AddressBook(0, 0)
    for (let i = 0; i < 1000; i++) expect(book.admit('a', i)).toBe('ok')
  })

  it('never goes below zero open and forgets idle addresses on sweep', () => {
    const book = new AddressBook(1, 0, 1000)
    book.release('ghost')
    expect(book.admit('a', 0)).toBe('ok')
    book.sweep(500)
    expect(book.size).toBe(1)
    book.release('a')
    book.sweep(500)
    expect(book.size).toBe(1)
    book.sweep(1000)
    expect(book.size).toBe(0)
  })
})

describe('idleAction', () => {
  it('lets a recent socket be, pings a quiet one and closes a silent one', () => {
    const { pingMs, idleMs } = DEFAULT_IDLE
    expect(idleAction(0, pingMs - 1)).toBe('ok')
    expect(idleAction(0, pingMs)).toBe('ping')
    expect(idleAction(0, idleMs - 1)).toBe('ping')
    expect(idleAction(0, idleMs)).toBe('close')
    expect(idleAction(1000, 1000 + idleMs, { pingMs: 10, idleMs: 20 })).toBe('close')
  })
})

describe('overBudget', () => {
  it('flags a send buffer past the limit', () => {
    expect(overBudget(MAX_BUFFERED_BYTES)).toBe(false)
    expect(overBudget(MAX_BUFFERED_BYTES + 1)).toBe(true)
    expect(overBudget(11, 10)).toBe(true)
  })
})
