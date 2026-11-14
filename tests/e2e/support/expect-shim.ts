/**
 * The few `vitest` assertions the adapter contract suite (`packages/testkit/src/contract.ts`) uses, for running it in a real
 * browser where vitest does not exist. Bundled in place of `vitest` by `folder-contract.spec.ts`.
 */
const same = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (a instanceof Uint8Array && b instanceof Uint8Array) return a.length === b.length && a.every((x, i) => x === b[i])
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  return ka.length === kb.length && ka.every((k) => same((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}

export function expect(actual: unknown, message = 'expectation') {
  const check = (ok: boolean, what: string) => { if (!ok) throw new Error(`${message}: expected ${what}`) }
  const positive = {
    toBe: (e: unknown) => check(Object.is(actual, e), `${String(actual)} to be ${String(e)}`),
    toEqual: (e: unknown) => check(same(actual, e), 'values to be equal'),
    toBeNull: () => check(actual === null, 'null'),
    toBeTruthy: () => check(!!actual, 'a truthy value'),
    toHaveLength: (n: number) => check((actual as { length: number }).length === n, `length ${n}, got ${(actual as { length: number }).length}`),
    toBeInstanceOf: (c: new (...a: never[]) => unknown) => check(actual instanceof c, `an instance of ${c.name}`),
  }
  return { ...positive, not: { toBe: (e: unknown) => check(!Object.is(actual, e), `${String(actual)} not to be ${String(e)}`) } }
}

export const describe = (_name: string, _body: () => void): void => undefined
export const it = (_name: string, _body: () => unknown): void => undefined
