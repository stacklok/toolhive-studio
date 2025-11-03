import { useState, useCallback } from 'react'

interface UseExpandableTextOptions {
  lengthLimit?: number
}

export function useExpandableText(options: UseExpandableTextOptions = {}) {
  const { lengthLimit = 200 } = options
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  const toggle = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }, [])

  const isExpanded = useCallback(
    (key: string) => expandedKeys.has(key),
    [expandedKeys]
  )

  const shouldCollapse = useCallback(
    (text: string) => text.length > lengthLimit,
    [lengthLimit]
  )

  return {
    toggle,
    isExpanded,
    shouldCollapse,
    lengthLimit,
  }
}
