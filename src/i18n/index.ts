import type en from "./locales/en.json";
import { createI18n } from "vue-i18n";

const messages = Object.fromEntries(
  Object.entries(import.meta.glob<{ default: typeof en }>("./locales/*.json", { eager: true })).map(
    ([key, value]) => [key.slice(10, -5), value.default],
  ),
);

/** A language the app can be shown in, named in that language */
export interface Language {
  value: string;
  label: string;
}

/** Every language there is a locale file for; add one here when you add its file */
export const supportedLanguages: ReadonlyArray<Language> = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
  { value: "es", label: "Español" },
];

export function isSupportedLanguage(locale: string): boolean {
  return supportedLanguages.some((language) => language.value === locale);
}

export default createI18n({
  locale: "en",
  fallbackLocale: "en",
  legacy: false,
  globalInjection: true,
  messages,
});
