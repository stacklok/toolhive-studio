import { useCallback, useEffect, useState } from 'react'

/**
 * Tracks the tallest height ever measured across a set of tab panels that
 * take turns being mounted one at a time (e.g. toggled via the `hidden`
 * attribute). Applying the returned `minHeight` to whichever panel is
 * currently shown keeps the container from growing/shrinking every time the
 * user switches tabs, once every panel has been visited at least once.
 */
export function useStableTabPanelMinHeight() {
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [minHeight, setMinHeight] = useState(0)

  useEffect(() => {
    if (!element || typeof ResizeObserver === 'undefined') return

    const measure = () => {
      setMinHeight((prev) => Math.max(prev, element.scrollHeight))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  const measureRef = useCallback((node: HTMLElement | null) => {
    setElement(node)
  }, [])

  return { measureRef, minHeight }
}
