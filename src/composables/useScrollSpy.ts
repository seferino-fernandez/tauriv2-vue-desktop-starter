import type { MaybeRefOrGetter } from 'vue'
import { useScroll } from '@vueuse/core'
import { onMounted, ref, shallowRef, toValue } from 'vue'

/**
 * Tracks which of the elements with the given ids the reader is at in a scroll container:
 * the last one whose top has scrolled past the container's top (plus `offset`), or the last
 * one once the container is scrolled to the bottom. `scrollTo` jumps to an element and marks
 * it current straight away, which also covers pages too short to scroll; it stays current while
 * the smooth scroll passes the sections in between.
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

  /** True while a jump's smooth scroll runs; its stop re-reads the position */
  let jumping = false
  const { arrivedState } = useScroll(root, {
    onScroll: update,
    onStop: () => {
      if (!jumping)
        return
      jumping = false
      update()
    },
  })

  function update() {
    const element = root.value
    if (!element || jumping)
      return
    // useScroll updates arrivedState before it calls onScroll. A container that can't scroll
    // also counts as at the bottom, so it must be able to scroll first.
    const scrollable = element.scrollHeight > element.clientHeight
    if (scrollable && arrivedState.bottom) {
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
    const section = document.getElementById(id)
    if (!section)
      return
    // Hold the highlight only if the container will actually scroll: with no scroll there is no stop
    const element = root.value
    if (element) {
      const margin = Number.parseFloat(getComputedStyle(section).scrollMarginTop) || 0
      const offsetTop = section.getBoundingClientRect().top - element.getBoundingClientRect().top - margin
      const target = Math.min(Math.max(element.scrollTop + offsetTop, 0), element.scrollHeight - element.clientHeight)
      jumping = Math.abs(target - element.scrollTop) >= 1
    }
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return { active, scrollTo }
}
