export interface Language {
  value: string;
  label: string;
}

export function supportedLanguages(): Array<Language> {
  return [
    {
      label: "English",
      value: "en",
    },
    {
      label: "中文",
      value: "zh",
    },
    {
      label: "Español",
      value: "es",
    },
  ];
}

export function getLanguageLabel(value: string): string {
  return supportedLanguages().find((lang) => lang.value === value)?.label ?? value;
}
