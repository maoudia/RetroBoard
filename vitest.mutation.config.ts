import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'
import base from './vitest.config'

// The Vitest config of the mutation run (stryker.config.json). Every mutant runs the tests that reach it, so a slow test
// costs its time once per mutant: suites named *.capacity.test.ts (a board of thousands of envelopes, seconds on real
// threads) stay in the unit run and out of this one.
export default mergeConfig(base, defineConfig({
  test: { exclude: [...configDefaults.exclude, '**/*.capacity.test.ts'] },
}))
