import { describe, expect, it } from "vitest";
import { getLanguageLabel, supportedLanguages } from "./config";

describe("supportedLanguages", () => {
  it("returns all configured languages", () => {
    const languages = supportedLanguages();
    expect(languages).toHaveLength(3);
  });

  it("includes English, Chinese, and Spanish", () => {
    const values = supportedLanguages().map((l) => l.value);
    expect(values).toEqual(["en", "zh", "es"]);
  });

  it("each language has a non-empty label and value", () => {
    for (const lang of supportedLanguages()) {
      expect(lang.value).toBeTruthy();
      expect(lang.label).toBeTruthy();
    }
  });

  it("returns a new array on each call", () => {
    const a = supportedLanguages();
    const b = supportedLanguages();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

describe("getLanguageLabel", () => {
  it("returns the label for a known language code", () => {
    expect(getLanguageLabel("en")).toBe("English");
    expect(getLanguageLabel("zh")).toBe("中文");
    expect(getLanguageLabel("es")).toBe("Español");
  });

  it("returns the value itself for an unknown language code", () => {
    expect(getLanguageLabel("fr")).toBe("fr");
    expect(getLanguageLabel("ja")).toBe("ja");
  });

  it("returns the value for an empty string", () => {
    expect(getLanguageLabel("")).toBe("");
  });
});
