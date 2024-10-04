import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  formatters: true,
  ignores: ['**/components/ui/**', '**/src-tauri/**', '**/vite-env.d.ts', 'vite.config.ts', 'tsconfig.json'],
  stylistic: {
    indent: 2,
    quotes: 'single',
  },
})
