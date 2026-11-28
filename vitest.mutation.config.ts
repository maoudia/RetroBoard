import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'
import base from './vitest.config'

// The Vitest config of the mutation run (stryker.config.json). Every mutant runs the tests that reach it, so a slow test
// costs its time once per mutant: suites named *.capacity.test.ts (a board of thousands of envelopes, seconds on real
// threads) stay in the unit run and out of this one. The same goes for every script test (scripts/*/test): they test the
// tooling, not the mutated packages, and many read repository files (docs, launch posts, gates) outside the sources Stryker
// copies to its sandbox, which fails its dry run. A glob, so a new script test never breaks the mutation run again.
export default mergeConfig(base, defineConfig({
  test: { exclude: [...configDefaults.exclude, '**/*.capacity.test.ts', 'scripts/*/test/**'] },
}))
