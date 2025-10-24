import { useQuery } from '@tanstack/react-query'
import { getApiV1BetaWorkloadsByNameOptions } from '@api/@tanstack/react-query.gen'
import { META_MCP_SERVER_NAME } from '@/common/lib/constants'

export function useMetaMcpConfig() {
  return useQuery({
    ...getApiV1BetaWorkloadsByNameOptions({
      path: { name: META_MCP_SERVER_NAME },
    }),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  })
}

/**
 * Gets the single group being optimized by meta-mcp from the ALLOWED_GROUPS env var,
 * or undefined if:
 * - The workload doesn't exist
 * - ALLOWED_GROUPS is not set
 * - ALLOWED_GROUPS contains multiple groups (comma-separated)
 */
export function getMetaMcpOptimizedGroup(
  config: { env_vars?: { [key: string]: string } } | undefined
): string | undefined {
  if (!config?.env_vars?.ALLOWED_GROUPS) {
    return undefined
  }

  const allowedGroups = config.env_vars.ALLOWED_GROUPS.trim()

  // If it contains a comma, it's multiple groups - return undefined
  if (allowedGroups.includes(',')) {
    return undefined
  }

  return allowedGroups || undefined
}
