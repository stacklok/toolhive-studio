import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Execute queries even when detects offline state
      networkMode: 'always',
    },
    mutations: {
      // Execute mutations (POST/PUT/DELETE) even when detects offline state
      networkMode: 'always',
    },
  },
})
