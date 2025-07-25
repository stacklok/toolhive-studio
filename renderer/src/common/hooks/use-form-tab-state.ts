import { useState } from 'react'

type FieldTabMapping<
  TabsType extends string,
  FieldsType extends string,
> = Record<FieldsType, TabsType>

interface UseFormTabStateOptions<
  TabsType extends string,
  FieldsType extends string,
> {
  fieldTabMap: FieldTabMapping<TabsType, FieldsType>
  defaultTab: TabsType
}

interface UseFormTabStateReturn<TabsType extends string> {
  activeTab: TabsType
  setActiveTab: (tab: TabsType) => void
  showFieldError: (fieldName: string) => void
  activateTabWithError: (errors: Record<string, unknown>) => void
  resetTab: () => void
}

export function useFormTabState<
  TabsType extends string,
  FieldsType extends string,
>({
  fieldTabMap,
  defaultTab,
}: UseFormTabStateOptions<
  TabsType,
  FieldsType
>): UseFormTabStateReturn<TabsType> {
  const [activeTab, setActiveTab] = useState<TabsType>(defaultTab)

  const showFieldError = (fieldName: string) => {
    const tabForField = fieldTabMap[fieldName as FieldsType]
    if (tabForField) {
      setActiveTab(tabForField)
    }
  }

  const activateTabWithError = (errors: Record<string, unknown>) => {
    const errorKeys = Object.keys(errors)
    // Extract root field name from error key (handles dot and bracket notation)
    const getRootField = (key: string): string => key.split(/[.[]/)[0] || key
    // Find the first tab that has an error
    const tabWithError = errorKeys.find((key) => {
      const rootField = getRootField(key)
      return rootField in fieldTabMap
    })
    if (tabWithError) {
      const rootField = getRootField(tabWithError)
      if (rootField && rootField.length > 0 && rootField in fieldTabMap) {
        const tab = fieldTabMap[rootField as FieldsType]
        setActiveTab(tab)
      }
    }
  }

  const resetTab = () => {
    setActiveTab(defaultTab)
  }

  return {
    activeTab,
    setActiveTab,
    showFieldError,
    activateTabWithError,
    resetTab,
  }
}

export type { FieldTabMapping }
