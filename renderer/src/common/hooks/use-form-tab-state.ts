import { useState } from 'react'

interface FieldTabMapping {
  field: string
  tab: string
}

interface UseFormTabStateOptions {
  fieldTabMap: FieldTabMapping[]
  defaultTab?: string
}

interface UseFormTabStateReturn {
  activeTab: string
  setActiveTab: (tab: string) => void
  showFieldError: (fieldName: string) => void
  activateTabWithError: (errors: Record<string, unknown>) => void
}

export function useFormTabState({
  fieldTabMap,
  defaultTab = 'configuration',
}: UseFormTabStateOptions): UseFormTabStateReturn {
  const [activeTab, setActiveTab] = useState(defaultTab)

  const showFieldError = (fieldName: string) => {
    const tabForField = fieldTabMap.find(
      ({ field }) => field === fieldName
    )?.tab
    if (tabForField) {
      setActiveTab(tabForField)
    }
  }

  const activateTabWithError = (errors: Record<string, unknown>) => {
    const errorKeys = Object.keys(errors)
    // Extract root field name from error key (handles dot and bracket notation)
    const getRootField = (key: string) => key.split(/[.[]/)[0]
    // Find the first tab that has an error
    const tabWithError = fieldTabMap.find(({ field }) =>
      errorKeys.some((key) => getRootField(key) === field)
    )?.tab
    if (tabWithError) {
      setActiveTab(tabWithError)
    }
  }

  return {
    activeTab,
    setActiveTab,
    showFieldError,
    activateTabWithError,
  }
}
