import { useState, useMemo } from 'react'

export interface UseFilterSortOptions<T> {
  data: T[]
  filterFields: (item: T) => string[]
  sortBy?: (item: T) => string
  sortOrder?: 'asc' | 'desc'
}

export function useFilterSort<T>({
  data,
  filterFields,
  sortBy,
  sortOrder: initialSortOrder = 'asc',
}: UseFilterSortOptions<T>) {
  const [filter, setFilter] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder)

  const toggleSortOrder = () => {
    setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'))
  }

  const filteredAndSortedData = useMemo(() => {
    const searchTerm = filter.toLowerCase()

    return data
      .filter((item) => {
        if (!searchTerm) return true
        const fields = filterFields(item)
        return fields.some((field) => field.toLowerCase().includes(searchTerm))
      })
      .sort((a, b) => {
        if (!sortBy) return 0
        const valueA = sortBy(a).toLowerCase()
        const valueB = sortBy(b).toLowerCase()

        const comparison = valueA.localeCompare(valueB)
        return sortOrder === 'desc' ? -comparison : comparison
      })
  }, [data, filter, filterFields, sortBy, sortOrder])

  return {
    filter,
    setFilter,
    filteredData: filteredAndSortedData,
    sortOrder,
    toggleSortOrder,
  }
}
