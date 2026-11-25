/** Quotes an installed family, keeping the normal UI stack as fallback. */
export function fontStack(family: string) {
  return `"${CSS.escape(family)}", var(--font-sans)`
}
