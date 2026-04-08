import { useEffect, useState } from 'react'

export interface ToolUiMetadataEntry {
  resourceUri: string
  serverName: string
}

/**
 * Returns the current map of tool names that have MCP App UIs.
 * Updated whenever a new chat stream starts (via chat:stream:tool-ui-metadata event).
 */
export function useMcpAppMetadata(): Record<string, ToolUiMetadataEntry> {
  const [metadata, setMetadata] = useState<Record<string, ToolUiMetadataEntry>>(
    {}
  )

  useEffect(() => {
    // Load initial metadata from main process cache
    window.electronAPI.chat
      .getToolUiMetadata()
      .then((data) => {
        if (data && Object.keys(data).length > 0) {
          setMetadata(data)
        }
      })
      .catch(() => {
        // Silently ignore — metadata will arrive via the stream event
      })

    // Listen for updates emitted at the start of each streaming session
    const unsubscribe = window.electronAPI.on(
      'chat:stream:tool-ui-metadata',
      (...args: unknown[]) => {
        const data = args[0] as Record<string, ToolUiMetadataEntry>
        if (data && typeof data === 'object') {
          setMetadata(data)
        }
      }
    )

    return unsubscribe
  }, [])

  return metadata
}
