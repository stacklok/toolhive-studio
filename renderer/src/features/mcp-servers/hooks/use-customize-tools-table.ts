import { useState, useEffect, useMemo, useRef } from 'react'
import { trackEvent } from '@/common/lib/analytics'
import {
  hasOverrideChanges as checkHasOverrideChanges,
  filterEmptyOverrides,
  hasOverrideDescription,
  getOriginalToolName,
  getDisplayName,
  getDisplayDescription,
  buildOverrideFromChanges,
  mergeToolOverride,
  createInitialEnabledTools,
} from '../lib/tool-override-utils'
import type { Tool, EditState, ToolOverrides } from '../types/tool-override'

interface UseCustomizeToolsTableProps {
  tools: Tool[]
  overrideTools?: ToolOverrides | null
  onApply?: (
    enabledTools: Record<string, boolean>,
    toolsOverride: ToolOverrides | null
  ) => Promise<void>
}

export function useCustomizeToolsTable({
  tools,
  overrideTools,
  onApply,
}: UseCustomizeToolsTableProps) {
  const [enabledTools, setEnabledTools] = useState<Record<string, boolean>>({})
  const [toolsOverride, setToolsOverride] = useState<ToolOverrides>(
    overrideTools ?? {}
  )
  const [lastOverrideTools, setLastOverrideTools] = useState(overrideTools)
  const [editState, setEditState] = useState<EditState>({
    isOpen: false,
    tool: null,
    name: '',
    description: '',
    hasOverrideDescription: false,
  })
  const toolsInitializedRef = useRef(false)
  const previousToolNamesRef = useRef<string>('')

  // Sync toolsOverride with overrideTools when it changes
  if (overrideTools !== lastOverrideTools) {
    setLastOverrideTools(overrideTools)
    if (overrideTools) {
      setToolsOverride(overrideTools)
    }
  }

  const isAllToolsEnabled = useMemo(() => {
    return Object.values(enabledTools).every((enabled) => enabled)
  }, [enabledTools])

  const isAllToolsDisabled = useMemo(() => {
    return Object.values(enabledTools).every((enabled) => !enabled)
  }, [enabledTools])

  // Check if there are pending override changes (including removals)
  const hasOverrideChanges = useMemo(
    () => checkHasOverrideChanges(toolsOverride, overrideTools),
    [toolsOverride, overrideTools]
  )

  // Check if enabled tools state has changed from initial state
  const hasEnabledToolsChanges = useMemo(() => {
    if (!tools || tools.length === 0) return false

    const initialEnabledTools = createInitialEnabledTools(tools)

    // Compare current enabledTools with initial state
    const allToolNames = new Set([
      ...Object.keys(enabledTools),
      ...Object.keys(initialEnabledTools),
    ])

    for (const toolName of allToolNames) {
      const current = enabledTools[toolName] ?? false
      const initial = initialEnabledTools[toolName] ?? false
      if (current !== initial) {
        return true
      }
    }

    return false
  }, [enabledTools, tools])

  // Check if there are any changes (overrides or enabled tools)
  const hasAnyChanges = useMemo(
    () => hasOverrideChanges || hasEnabledToolsChanges,
    [hasOverrideChanges, hasEnabledToolsChanges]
  )

  useEffect(() => {
    if (tools && tools.length > 0) {
      // Create a stable key from tool names to detect actual changes
      const currentToolNames = tools
        .map((t) => `${t.name}:${t.isInitialEnabled ?? true}`)
        .sort()
        .join(',')

      // Only reset if the actual tool set changed (not just array reference)
      if (
        !toolsInitializedRef.current ||
        previousToolNamesRef.current !== currentToolNames
      ) {
        const initialState = createInitialEnabledTools(tools)
        setEnabledTools((prev) => {
          // If state is empty, initialize it
          if (Object.keys(prev).length === 0) {
            toolsInitializedRef.current = true
            previousToolNamesRef.current = currentToolNames
            return initialState
          }
          // Check if tool names have actually changed (not just reordered)
          const prevToolNames = new Set(Object.keys(prev))
          const currentToolNamesSet = new Set(tools.map((t) => t.name))

          // If tool set is different, reset to initial state
          const toolSetChanged =
            prevToolNames.size !== currentToolNamesSet.size ||
            ![...currentToolNamesSet].every((name) => prevToolNames.has(name))

          if (toolSetChanged) {
            toolsInitializedRef.current = true
            previousToolNamesRef.current = currentToolNames
            return initialState
          }

          // Tool set is the same but isInitialEnabled might have changed
          // (e.g., when a filter is applied/removed). Since the key changed, reset to new initial state.
          // This ensures that when a filter changes, tools are enabled/disabled correctly.
          toolsInitializedRef.current = true
          previousToolNamesRef.current = currentToolNames
          return initialState
        })
      }
    }
  }, [tools])

  const handleToolToggle = (toolName: string, enabled: boolean) => {
    trackEvent('Customize Tools: toggle tool', {
      tool_name: toolName,
      enabled: enabled ? 'true' : 'false',
    })
    setEnabledTools((prev) => ({
      ...prev,
      [toolName]: enabled,
    }))
  }

  const handleAllToolsToggle = (enabled: boolean) => {
    trackEvent('Customize Tools: toggle all tools', {
      enabled: enabled ? 'true' : 'false',
    })
    setEnabledTools((prev) => {
      return Object.fromEntries(
        Object.keys(prev).map((toolName) => [toolName, enabled])
      )
    })
  }

  const handleApply = () => {
    const filteredOverrides = filterEmptyOverrides(toolsOverride)
    const hasOverrides = Object.keys(filteredOverrides).length > 0
    onApply?.(enabledTools, hasOverrides ? filteredOverrides : null)
  }

  const handleEditTool = (tool: Tool) => {
    const originalName = getOriginalToolName(tool)
    const localOverride = toolsOverride[originalName]
    const savedOverride = overrideTools?.[originalName]

    // Use local override values if they exist, otherwise use tool's current values
    const displayName = getDisplayName(tool, localOverride)
    const displayDescription = getDisplayDescription(tool, localOverride)
    const hasOverrideDesc = hasOverrideDescription(localOverride, savedOverride)

    setEditState({
      isOpen: true,
      tool: {
        name: originalName, // Always use original name as the key
        description: tool.originalDescription || '', // Original description from serverTools for helper text
        originalName,
        originalDescription: tool.originalDescription,
      },
      name: displayName, // Use display name from local override if available
      description: displayDescription, // Use display description from local override if available
      hasOverrideDescription: hasOverrideDesc, // Track if override description exists
    })
    trackEvent('Customize Tools: open edit tool modal', {
      tool_name: originalName,
    })
  }

  const resetEditState = () => {
    setEditState({
      isOpen: false,
      tool: null,
      name: '',
      description: '',
      hasOverrideDescription: false,
    })
  }

  const handleSaveToolOverride = () => {
    const { tool } = editState
    if (!tool) return

    const originalName = tool.name // This is the original tool name (key)
    const originalDescription = tool.originalDescription || ''

    // Check for existing override (local or saved) to compare against
    const existingOverride =
      toolsOverride[originalName] || overrideTools?.[originalName]
    const existingName = existingOverride?.name ?? originalName
    const existingDescription =
      existingOverride?.description ?? originalDescription

    // Build override from changes, comparing against existing values
    const newOverride = buildOverrideFromChanges(
      editState.name,
      editState.description,
      originalName,
      originalDescription,
      existingName,
      existingDescription
    )

    const hasChanges = Object.keys(newOverride).length > 0

    if (hasChanges) {
      setToolsOverride((prev) => {
        const prevLocalOverride = prev[originalName]
        const merged = mergeToolOverride(
          newOverride,
          prevLocalOverride,
          existingOverride
        )

        if (merged === null) {
          // Remove override entry if merged is empty
          const newOverrides = { ...prev }
          delete newOverrides[originalName]
          return newOverrides
        }

        return {
          ...prev,
          [originalName]: merged,
        }
      })
      trackEvent('Customize Tools: save tool override', {
        tool_key: originalName,
        has_name_override: newOverride.name !== undefined,
        has_description_override: newOverride.description !== undefined,
      })
    } else {
      // Remove override if no changes from original
      setToolsOverride((prev) => {
        const newOverrides = { ...prev }
        delete newOverrides[originalName]
        return newOverrides
      })
    }

    resetEditState()
  }

  const handleCloseEditModal = () => {
    trackEvent('Customize Tools: close edit tool modal', {
      tool_name: editState.tool?.name || '',
    })
    resetEditState()
  }

  const handleNameChange = (name: string) => {
    setEditState((prev) => ({ ...prev, name }))
  }

  const handleDescriptionChange = (description: string) => {
    setEditState((prev) => ({ ...prev, description }))
  }

  return {
    enabledTools,
    toolsOverride,
    editState,
    isAllToolsEnabled,
    isAllToolsDisabled,
    hasOverrideChanges,
    hasEnabledToolsChanges,
    hasAnyChanges,
    handleToolToggle,
    handleAllToolsToggle,
    handleApply,
    handleEditTool,
    handleSaveToolOverride,
    handleCloseEditModal,
    handleNameChange,
    handleDescriptionChange,
  }
}
