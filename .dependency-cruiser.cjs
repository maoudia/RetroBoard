/**
 * Architecture rules (docs/PLAN.md section 3.1). Run with `pnpm arch`.
 * domain <- nothing; application <- domain; protocol <- domain (+ valibot);
 * packages never import apps; no cycles.
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-is-pure',
      comment: 'The domain has no I/O, no framework and no third-party runtime dependency.',
      severity: 'error',
      from: { path: '^packages/domain/src' },
      to: { pathNot: '^packages/domain/src' },
    },
    {
      name: 'application-depends-on-domain-only',
      severity: 'error',
      from: { path: '^packages/application/src' },
      to: { pathNot: '^packages/(application|domain)/src' },
    },
    {
      name: 'protocol-depends-on-domain-and-valibot',
      severity: 'error',
      from: { path: '^packages/protocol/src' },
      to: { pathNot: ['^packages/(protocol|domain)/src', 'node_modules/.*valibot/'] },
    },
    {
      name: 'exporters-depend-on-read-models',
      severity: 'error',
      from: { path: '^packages/exporters/src' },
      to: { pathNot: '^packages/(exporters|application|domain)/src' },
    },
    {
      name: 'data-packages-stay-data',
      comment: 'i18n has no dependency; themes may only load font stylesheets and domain constants.',
      severity: 'error',
      from: { path: '^packages/(i18n|themes)/src' },
      to: { pathNot: ['^packages/(i18n|themes|domain)/src', '@fontsource'] },
    },
    {
      name: 'crypto-is-self-contained',
      comment: 'Primitives use WebCrypto only; the @noble/curves fallback is the one allowed dependency.',
      severity: 'error',
      from: { path: '^packages/crypto/src' },
      to: { pathNot: ['^packages/crypto/src', '@noble/'] },
    },
    {
      name: 'sync-is-self-contained',
      severity: 'error',
      from: { path: '^packages/sync/src' },
      to: { pathNot: '^packages/sync/src' },
    },
    {
      name: 'packages-never-import-apps',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'production-code-never-imports-testkit',
      severity: 'error',
      from: { path: '^(packages/[^/]+/src|apps/[^/]+/(src|app))' },
      to: { path: '^packages/testkit/' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      // Type-only cycles (e.g. Env <-> Room declarations) erase at runtime.
      to: { circular: true, dependencyTypesNot: ['type-only'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(\\.nuxt|\\.output|node_modules/\\.cache)' },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    preserveSymlinks: false,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.js', '.mjs', '.json'],
    },
  },
}
