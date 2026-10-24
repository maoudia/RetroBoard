import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  { ignores: ['apps/relay/worker-configuration.d.ts', '**/.nuxt/**', '**/.output/**', '.output/**', 'playwright-report/**', 'test-results/**'] },
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/html-self-closing': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
)
