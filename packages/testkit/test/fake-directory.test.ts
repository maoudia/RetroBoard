import { describe, expect, it } from 'vitest'
import { createFakeDirectory } from '../src'

const bytes = (...n: number[]) => new Uint8Array(n)

const nameOf = async (op: () => Promise<unknown>) => op().then(() => null, (e: DOMException) => e.name)

describe('fake directory', () => {
  it('replaces a file whole on close, and leaves it as it was when the writer aborts', async () => {
    const dir = createFakeDirectory()
    const file = await dir.getFileHandle('a.rbs', { create: true })
    const w = await file.createWritable()
    await w.write(bytes(1, 2))
    await w.write(bytes(3))
    expect(dir.read('a.rbs')).toEqual(bytes())
    await w.close()
    expect(dir.read('a.rbs')).toEqual(bytes(1, 2, 3))
    const aborted = await file.createWritable()
    await aborted.write(bytes(9))
    await aborted.abort()
    await aborted.close()
    expect(dir.read('a.rbs')).toEqual(bytes())
  })

  it('fails the next write with the error it was told, once', async () => {
    const dir = createFakeDirectory()
    const file = await dir.getFileHandle('a.rbs', { create: true })
    dir.failNextWrite('QuotaExceededError')
    expect(await nameOf(() => file.createWritable())).toBe('QuotaExceededError')
    const w = await file.createWritable()
    await w.write(bytes(1))
    await w.close()
    expect(dir.read('a.rbs')).toEqual(bytes(1))
  })

  it('refuses a name that is a folder where a file is wanted, and the other way round', async () => {
    const dir = createFakeDirectory()
    await dir.getDirectoryHandle('s', { create: true })
    await dir.getFileHandle('f', { create: true })
    expect(await nameOf(() => dir.getFileHandle('s'))).toBe('TypeMismatchError')
    expect(await nameOf(() => dir.getDirectoryHandle('f'))).toBe('TypeMismatchError')
    expect(await nameOf(() => dir.getFileHandle('missing'))).toBe('NotFoundError')
    expect(await nameOf(() => dir.getDirectoryHandle('missing'))).toBe('NotFoundError')
  })

  it('removes a file, an empty folder, and a full folder only when asked to recurse', async () => {
    const dir = createFakeDirectory()
    dir.drop('s/x.rbs', bytes(1))
    dir.drop('t/y.rbs', bytes(1))
    expect(await nameOf(() => dir.removeEntry('s'))).toBe('InvalidModificationError')
    await dir.removeEntry('s', { recursive: true })
    const t = await dir.getDirectoryHandle('t')
    await t.removeEntry('y.rbs')
    await dir.removeEntry('t')
    expect(dir.files()).toEqual([])
    expect(await nameOf(() => dir.removeEntry('gone'))).toBe('NotFoundError')
  })

  it('lets the test move the clock the files are stamped with', async () => {
    const dir = createFakeDirectory()
    dir.clock = () => 5_000
    expect(dir.clock()).toBe(5_000)
    dir.drop('a.rbs', bytes(1))
    expect(dir.modified('a.rbs')).toBeGreaterThanOrEqual(5_000)
  })

  it('reads and dates nothing from a path that does not exist, a folder, or below a file', () => {
    const dir = createFakeDirectory()
    dir.drop('s/x.rbs', bytes(1))
    for (const path of ['nope', 's', 'nope/x.rbs', 's/x.rbs/below']) {
      expect(dir.read(path), path).toBeNull()
      expect(dir.modified(path), path).toBeNull()
    }
  })

  it('renames a file across folders and refuses to rename what is not there', () => {
    const dir = createFakeDirectory()
    dir.drop('s/x.rbs', bytes(1, 2))
    dir.rename('s/x.rbs', 't/y.rbs')
    expect(dir.files()).toEqual(['t/y.rbs'])
    expect(dir.read('t/y.rbs')).toEqual(bytes(1, 2))
    expect(() => dir.rename('s/gone.rbs', 't/z.rbs')).toThrow(/NotFoundError|gone|not/i)
  })
})
