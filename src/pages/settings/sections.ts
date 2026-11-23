import type { Component } from 'vue'
import IconKeyboard from '~icons/ph/keyboard-duotone'
import IconPalette from '~icons/ph/palette-duotone'
import IconTranslate from '~icons/ph/translate-duotone'

export interface SettingsSection {
  id: string
  titleKey: string
  icon: Component
}

// The settings page and its panel both follow this list: add a section here, then render it
// on the page with `:id="sectionElementId(id)"`
export const settingsSections: readonly SettingsSection[] = [
  { id: 'appearance', titleKey: 'settings.appearance.label', icon: IconPalette },
  { id: 'language', titleKey: 'languages.label', icon: IconTranslate },
  { id: 'shortcuts', titleKey: 'settings.shortcuts.label', icon: IconKeyboard },
]

/** DOM id of a section on the settings page, which the panel scrolls to */
export function sectionElementId(id: string): string {
  return `settings-${id}`
}
