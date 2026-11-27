import { describe, expect, it } from "vitest";
import i18n, { supportedLanguages } from "./index";

describe("supportedLanguages", () => {
  it("lists exactly the languages there is a locale file for", () => {
    const listed = supportedLanguages.map((language) => language.value);
    expect(new Set(listed)).toEqual(new Set(i18n.global.availableLocales));
    expect(listed).toHaveLength(i18n.global.availableLocales.length);
  });
});
