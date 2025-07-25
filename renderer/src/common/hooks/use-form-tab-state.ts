import { useState } from 'react'

interface FieldTabMapping<TabsType extends string, FieldsType extends string> {
  field: FieldsType
  tab: TabsType
}

interface UseFormTabStateOptions<
  TabsType extends string,
  FieldsType extends string,
> {
  fieldTabMap: FieldTabMapping<TabsType, FieldsType>[]
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
