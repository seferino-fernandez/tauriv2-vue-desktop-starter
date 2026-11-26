/**
 * Renames the starter to your app, once, right after cloning:
 * `just rename "My App" com.example.myapp`
 *
 * "My App" becomes the window title and product name, `my-app` the npm and Cargo package name,
 * `my_app_lib` the Rust library, and the identifier replaces the starter's bundle identifier.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'

const [name, identifier] = process.argv.slice(2)
if (!name || !identifier) {
  console.error('usage: just rename "My App" com.example.myapp')
  process.exit(1)
}

const kebab = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const snake = kebab.replaceAll('-', '_')
if (!/^[a-z]/.test(kebab)) {
  console.error(`"${name}" needs to start with a letter to make a package name`)
  process.exit(1)
}

const oldKebab = 'tauriv2-vue-desktop-starter'
const oldSnake = 'tauriv2_vue_desktop_starter'
const oldIdentifier = `com.github.${oldKebab}`

// Order matters: the display-name spots and the identifier contain the kebab name
const replacements: [RegExp | string, string][] = [
  [`"productName": "${oldKebab}"`, `"productName": ${JSON.stringify(name)}`],
  [`"title": "${oldKebab}"`, `"title": ${JSON.stringify(name)}`],
  [`<title>${oldKebab}</title>`, `<title>${name}</title>`],
  [
    new RegExp(`^# ${oldKebab}$`, 'gm'),
    `# ${name}`,
  ],
  [oldIdentifier, identifier],
  [oldSnake, snake],
  [oldKebab, kebab],
]

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(file => file && file !== 'scripts/rename.ts')

for (const file of files) {
  let text: string
  try {
    text = readFileSync(file, 'utf8')
  }
  catch {
    continue // listed in git but deleted from the working tree
  }
  if (!text.includes(oldKebab) && !text.includes(oldSnake))
    continue
  for (const [from, to] of replacements)
    text = text.replaceAll(from, () => to)
  writeFileSync(file, text)
  console.log(`renamed in ${file}`)
}
