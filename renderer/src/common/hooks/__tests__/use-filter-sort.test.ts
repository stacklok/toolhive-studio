import { renderHook, act } from '@testing-library/react'
import { useFilterSort } from '../use-filter-sort'

interface TestItem {
  name: string
  description: string
  value: number
}

const mockData: TestItem[] = [
  { name: 'Zebra', description: 'Last animal', value: 3 },
  { name: 'Apple', description: 'Red fruit', value: 1 },
  { name: 'Banana', description: 'Yellow fruit', value: 2 },
  { name: 'Cherry', description: 'Small red fruit', value: 4 },
]

describe('useFilterSort', () => {
  const defaultOptions = {
    data: mockData,
    filterFields: (item: TestItem) => [item.name, item.description],
    sortBy: (item: TestItem) => item.name,
  }

  describe('filtering', () => {
    it.each([
      {
        filter: 'apple',
        expectedLength: 1,
        expectedNames: ['Apple'],
        description: 'filters data based on name field',
      },
      {
        filter: 'fruit',
        expectedLength: 3,
        expectedNames: ['Apple', 'Banana', 'Cherry'],
        description: 'filters data based on description field',
      },
      {
        filter: 'APPLE',
        expectedLength: 1,
        expectedNames: ['Apple'],
        description: 'is case insensitive when filtering',
      },
      {
        filter: 'red',
        expectedLength: 2,
        expectedNames: ['Apple', 'Cherry'],
        description: 'filters across multiple description matches',
      },
    ])('$description', ({ filter, expectedLength, expectedNames }) => {
      const { result } = renderHook(() => useFilterSort(defaultOptions))

      act(() => {
        result.current.setFilter(filter)
      })

      expect(result.current.filteredData).toHaveLength(expectedLength)
      expect(result.current.filteredData.map((item) => item.name)).toEqual(
        expectedNames
      )
    })
  })

  describe('sorting', () => {
    it.each([
      {
        sortOrder: 'asc' as const,
        expectedNames: ['Apple', 'Banana', 'Cherry', 'Zebra'],
        description: 'sorts data alphabetically in ascending order by default',
      },
      {
        sortOrder: 'desc' as const,
        expectedNames: ['Zebra', 'Cherry', 'Banana', 'Apple'],
        description: 'sorts data in descending order when sortOrder is desc',
      },
    ])('$description', ({ sortOrder, expectedNames }) => {
      const { result } = renderHook(() =>
        useFilterSort({ ...defaultOptions, sortOrder })
      )

      const names = result.current.filteredData.map((item) => item.name)
      expect(names).toEqual(expectedNames)
    })
  })
})
