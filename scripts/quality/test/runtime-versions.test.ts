import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// One Node for development, CI and production: .node-version is the source and everything else must agree with it.
const root = join(import.meta.dirname, '../../..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')
const major = Number(/^(\d+)/.exec(read('.node-version').trim())![1])

describe('one Node version everywhere', () => {
  it('is the current LTS line, an even major', () => {
    expect(major).toBeGreaterThanOrEqual(26)
    expect(major % 2).toBe(0)
  })

  it('is read by mise from .node-version, with no second pin in .mise.toml', () => {
    const mise = read('.mise.toml')
    expect(mise).toMatch(/idiomatic_version_file_enable_tools\s*=\s*\[\s*"node"\s*\]/)
    expect(mise).not.toMatch(/^\s*node\s*=/m)
    expect(read('mise.lock')).toMatch(new RegExp(`\\[\\[tools\\.node\\]\\]\\s+version = "${major}\\.`))
  })

  it('is what every GitHub Actions job installs', () => {
    const files = readdirSync(join(root, '.github/workflows')).filter((f) => f.endsWith('.yml'))
    let pins = 0
    for (const f of files) {
      for (const line of read(`.github/workflows/${f}`).split('\n')) {
        if (!/^\s+node-version(-file)?:/.test(line)) continue
        pins++
        expect(line.trim(), `${f}`).toBe('node-version-file: .node-version')
      }
    }
    expect(pins).toBeGreaterThan(0)
  })

  it('is the base of the production image, in every stage', () => {
    const from = [...read('Dockerfile').matchAll(/^FROM node:(\d+)/gm)].map((m) => Number(m[1]))
    expect(from.length).toBeGreaterThan(0)
    expect(new Set(from)).toEqual(new Set([major]))
  })

  it('is the engine floor and the version of the Node typings', () => {
    const pkg = JSON.parse(read('package.json')) as { engines: { node: string }; devDependencies: Record<string, string> }
    expect(pkg.engines.node).toBe(`>=${major}`)
    expect(pkg.devDependencies['@types/node']).toMatch(new RegExp(`^\\^${major}\\.`))
  })
})
