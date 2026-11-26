import antfu from '@antfu/eslint-config'
import vueI18n from '@intlify/eslint-plugin-vue-i18n'

export default antfu(
  {
    vue: true,
    typescript: true,
    formatters: true,
    gitignore: true,
    ignores: [
      '**/components/ui/**',
      '**/src-tauri/**',
      '**/vite-env.d.ts',
      'vite.config.ts',
      'tsconfig.json',
      'tsconfig.app.json',
      'tsconfig.node.json',
      '.github/**',
      'docs/**',
    ],
    stylistic: {
      indent: 2,
      quotes: 'single',
    },
  },
  ...vueI18n.configs.base,
  {
    // Every call into Rust goes through a typed wrapper in src/lib/*-commands.ts
    files: ['src/**/*.ts', 'src/**/*.vue'],
    ignores: ['src/lib/*-commands.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@tauri-apps/api/core',
              importNames: ['invoke'],
              message: 'Call Rust through a typed wrapper in src/lib/*-commands.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.vue'],
    settings: {
      'vue-i18n': {
        localeDir: './src/i18n/locales/*.json',
        messageSyntaxVersion: '^11.4.0',
      },
    },
  },
)
