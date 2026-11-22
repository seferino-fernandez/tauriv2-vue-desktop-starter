import type { MaybeRefOrGetter } from 'vue'
import { useEventListener } from '@vueuse/core'
import { onMounted, ref, shallowRef, toValue } from 'vue'

/**
 * Tracks which of the elements with the given ids the reader is at in a scroll container:
 * the last one whose top has scrolled past the container's top (plus `offset`), or the last
 * one once the container is scrolled to the bottom. `scrollTo` jumps to an element and marks
 * it current straight away, which also covers pages too short to scroll.
 */
export function useScrollSpy(
  ids: readonly string[],
  container: MaybeRefOrGetter<HTMLElement | null | undefined>,
  offset = 24,
) {
  const active = ref<string | undefined>(ids[0])
  // Resolved once mounted, so a container rendered after the caller (e.g. a sibling) is found
  const root = shallowRef<HTMLElement | null>()
  onMounted(() => {
    root.value = toValue(container)
  })

  function update() {
    const element = root.value
    if (!element)
      return
    const scrollable = element.scrollHeight > element.clientHeight
    if (scrollable && element.scrollTop + element.clientHeight >= element.scrollHeight - 1) {
      active.value = ids[ids.length - 1]
      return
    }
    const top = element.getBoundingClientRect().top + offset
    let current = ids[0]
    for (const id of ids) {
      const section = document.getElementById(id)
      if (section && section.getBoundingClientRect().top <= top)
        current = id
    }
    active.value = current
  }

  function scrollTo(id: string) {
    active.value = id
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEventListener(root, 'scroll', update, { passive: true })

  return { active, scrollTo }
}
