import type en from "./locales/en.json";
import { createI18n } from "vue-i18n";

const messages = Object.fromEntries(
  Object.entries(import.meta.glob<{ default: typeof en }>("./locales/*.json", { eager: true })).map(
    ([key, value]) => [key.slice(10, -5), value.default],
  ),
);

export default createI18n({
  locale: "en",
  fallbackLocale: "en",
  legacy: false,
  globalInjection: true,
  messages,
});
