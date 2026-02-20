import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { CoreWorkload } from '@common/api/generated/types.gen'

export function useComplianceCheck(
  serverName: string,
  status: CoreWorkload['status']
) {
  const queryClient = useQueryClient()
  const prevStatusRef = useRef(status)

  useEffect(() => {
    if (status === 'running' && prevStatusRef.current !== 'running') {
      queryClient.invalidateQueries({
        queryKey: ['mcp-compliance', serverName],
      })
    }
    prevStatusRef.current = status
  }, [status, serverName, queryClient])

  const query = useQuery({
    queryKey: ['mcp-compliance', serverName],
    queryFn: async () => {
      const report = await window.electronAPI.mcpCompliance.runChecks(serverName)
      console.log(`[compliance] ${serverName}:`, report)
      return report
    },
    enabled: status === 'running',
    staleTime: Infinity,
    retry: false,
  })

  return {
    report: query.data ?? null,
    isChecking: query.isFetching,
    error: query.error,
    recheck: query.refetch,
  }
}
