import cloudflare from "@cloudflare/oxlint-config";
import { defineConfig } from "oxlint";

// Cloudflare's preset is built for React apps; this one is Vue
const reactRulesOff = Object.fromEntries(
  Object.keys(cloudflare.rules ?? {})
    .filter((rule) => /^(react|jsx-a11y)\/|use-effect/.test(rule))
    .map((rule) => [rule, "off"]),
);

export default defineConfig({
  extends: [cloudflare],
  env: cloudflare.env,
  ignorePatterns: [
    ...cloudflare.ignorePatterns,
    // Local agent tooling, ignored by the user's global gitignore rather than this repo's
    ".agents/**",
    ".claude/**",
    "src-tauri/**",
    // The shadcn-vue CLI owns these
    "src/components/ui/**",
  ],
  plugins: ["typescript", "import", "oxc", "promise", "unicorn", "vitest", "vue"],
  globals: {
    defineEmits: "readonly",
    defineExpose: "readonly",
    defineModel: "readonly",
    defineOptions: "readonly",
    defineProps: "readonly",
    defineSlots: "readonly",
    withDefaults: "readonly",
  },
  rules: {
    ...reactRulesOff,
    // Narrowing DOM nodes and caught errors is what instanceof is for
    "@nkzw/no-instanceof": "off",
    // The stores call the command wrappers by the same names as their own actions
    "import/no-namespace": "off",
    // Every call into Rust goes through a typed wrapper in src/lib/*-commands.ts
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "@tauri-apps/api/core",
            importNames: ["invoke"],
            message: "Call Rust through a typed wrapper in src/lib/*-commands.ts.",
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ["src/lib/*-commands.ts"],
      rules: { "no-restricted-imports": "off" },
    },
    {
      // The rename script reports what it did; logError falls back to the console without the log plugin
      files: ["scripts/**", "src/lib/log.ts"],
      rules: { "no-console": "off" },
    },
  ],
});
