import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { checkDisables, sourceFiles } from '../stryker-disables.mjs'

describe('Stryker disables', () => {
  const check = (line: string) => checkDisables('f.ts', `const a = 1\n${line}\nconst b = 2`) as string[]

  it('accept a named mutator with a reason', () => {
    expect(check('// Stryker disable next-line StringLiteral: the message is only shown to the developer')).toEqual([])
    expect(check('// Stryker disable next-line ConditionalExpression, EqualityOperator: both spellings of the same guard')).toEqual([])
  })

  it('refuse a disable without a mutator or without a reason', () => {
    expect(check('// Stryker disable next-line')[0]).toContain('naming the mutator and giving a reason')
    expect(check('// Stryker disable next-line StringLiteral')).toHaveLength(1)
    expect(check('// Stryker disable next-line StringLiteral:')).toHaveLength(1)
    expect(check('// Stryker disable next-line StringLiteral: because')).toEqual(['f.ts:2: the reason is too short to explain why no test can tell the mutant apart'])
  })

  it('refuse "all" in any form', () => {
    expect(check('// Stryker disable next-line all: a long enough reason to be read')).toEqual(['f.ts:2: name the mutators instead of "all"'])
    expect(check('// Stryker disable all: a long enough reason to be read')).toEqual(['f.ts:2: name the mutators instead of "all"'])
    expect(checkDisables('f.ts', '// Stryker disable all\n')[0]).toContain('naming the mutator')
    expect(checkDisables('f.ts', '// Stryker restore all\n')).toEqual(['f.ts:1: name the mutators instead of "all"'])
  })

  it('accept a named block with a reason, closed by a matching restore, and nothing else', () => {
    const block = (restore: string) => checkDisables('f.ts', `// Stryker disable StringLiteral, ArrayDeclaration: word list data, checked on sentences\nconst a = []\n${restore}\n`) as string[]
    expect(block('// Stryker restore ArrayDeclaration, StringLiteral')).toEqual([])
    expect(block('// Stryker restore StringLiteral')).toEqual(['f.ts:3: nothing to restore: no block disabled these mutators', 'f.ts:1: this block disable is never restored'])
    expect(checkDisables('f.ts', '// Stryker disable StringLiteral: word list data, checked on sentences\n')).toEqual(['f.ts:1: this block disable is never restored'])
    expect(checkDisables('f.ts', '// Stryker restore StringLiteral\n')).toEqual(['f.ts:1: nothing to restore: no block disabled these mutators'])
    expect(checkDisables('f.ts', '// Stryker disable StringLiteral: short\n// Stryker restore StringLiteral\n')).toHaveLength(1)
  })

  it('leave ordinary comments and code alone', () => {
    expect(checkDisables('f.ts', '// Stryker is a mutation tester\nconst disable = 1\n')).toEqual([])
  })

  it('hold for every source file of the packages', () => {
    const root = join(import.meta.dirname, '../../..')
    const problems: string[] = []
    for (const pkg of ['domain', 'application', 'protocol', 'crypto', 'exporters', 'sync']) {
      for (const file of sourceFiles(join(root, 'packages', pkg, 'src')) as string[]) problems.push(...(checkDisables(relative(root, file), readFileSync(file, 'utf8')) as string[]))
    }
    expect(problems).toEqual([])
  })
})
