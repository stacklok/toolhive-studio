import { useQuery } from '@tanstack/react-query'

/**
 * Hook to manage MCP tool states across the application
 * This ensures that individual tool selections are loaded and available globally
 */
export function useMcpTools() {
  // Load all individual tool states
  const { data: enabledMcpTools, isLoading } = useQuery({
    queryKey: ['enabled-mcp-tools'],
    queryFn: async (): Promise<Record<string, string[]>> => {
      return window.electronAPI.chat.getEnabledMcpTools()
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  })

  return {
    enabledMcpTools: enabledMcpTools || {},
    isLoading,
  }
}
