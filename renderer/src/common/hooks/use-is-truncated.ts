import { useEffect, useRef, useState } from 'react'

/**
 * Detects when an element's text is visually truncated.
 * Works for single-line (with `truncate`) and multi-line (line-clamp) cases.
 *
 * Accepts the element directly (not a ref) so the effect re-runs
 * whenever the underlying DOM node changes (e.g. Radix remounts).
 */
export function useIsTruncated<T extends HTMLElement>(
  element: T | null
): boolean {
  const [isTruncated, setIsTruncated] = useState(false)
  const rafIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!element) return

    const measure = () => {
      const nextIsTruncated =
        element.scrollWidth > element.clientWidth ||
        element.scrollHeight > element.clientHeight
      setIsTruncated(nextIsTruncated)
    }

    const scheduleMeasure = () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = requestAnimationFrame(measure)
    }

    scheduleMeasure()

    let ro: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(scheduleMeasure)
      ro.observe(element)
    }

    const mo = new MutationObserver(scheduleMeasure)
    mo.observe(element, {
      characterData: true,
      childList: true,
      subtree: true,
    })

    window.addEventListener('resize', scheduleMeasure)

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      window.removeEventListener('resize', scheduleMeasure)
      mo.disconnect()
      ro?.disconnect()
    }
  }, [element])

  return isTruncated
}
