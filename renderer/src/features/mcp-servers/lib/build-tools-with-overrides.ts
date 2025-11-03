import type { V1ToolOverride } from '@api/types.gen'
import type { Tool, ToolWithMetadata } from '../types/tool-override'

interface BuildToolsWithOverridesParams {
  registryTools: string[]
  serverTools: Record<string, { description?: string }> | null
  toolsOverride?: Record<string, V1ToolOverride> | null
  enabledToolsFilter?: string[] | null
}

/**
 * Creates a map of registry tools with empty descriptions
 */
const createRegistryToolsMap = (
  registryTools: string[]
): Record<string, Tool> =>
  Object.fromEntries(
    registryTools.map((name) => [name, { name, description: '' }])
  )

/**
 * Creates a map of server tools with their descriptions
 */
const createServerToolsMap = (
  serverTools: Record<string, { description?: string }> | null
): Record<string, Tool> =>
  serverTools
    ? Object.fromEntries(
        Object.entries(serverTools).map(([name, toolDef]) => [
          name,
          { name, description: toolDef.description || '' },
        ])
      )
    : {}

/**
 * Merges registry and server tools into a combined map
 */
const createCombinedToolsMap = (
  registryTools: string[],
  serverTools: Record<string, { description?: string }> | null
): Record<string, Tool> => ({
  ...createRegistryToolsMap(registryTools),
  ...createServerToolsMap(serverTools),
})

/**
 * Extracts override display names (overridden tool names) from tools_override
 */
const getOverrideNames = (
  toolsOverride: Record<string, V1ToolOverride> | null
): Set<string> =>
  toolsOverride
    ? new Set(
        Object.values(toolsOverride)
          .map((override) => override.name)
          .filter((name): name is string => !!name)
      )
    : new Set<string>()

/**
 * Gets override keys that have name overrides (not just description)
 */
const getNameOverrideKeys = (
  toolsOverride: Record<string, V1ToolOverride> | null
): Set<string> => {
  if (!toolsOverride) return new Set<string>()
  const keys = new Set<string>()
  Object.entries(toolsOverride).forEach(([key, override]) => {
    if (override.name) {
      keys.add(key)
    }
  })
  return keys
}

/**
 * Checks if a tool should be excluded (has a name override)
 */
const shouldExcludeTool = (
  toolName: string,
  nameOverrideKeys: Set<string>,
  overrideNames: Set<string>
): boolean => nameOverrideKeys.has(toolName) || overrideNames.has(toolName)

/**
 * Determines if a tool is initially enabled based on the filter
 */
const isToolInitiallyEnabled = (
  toolName: string,
  enabledToolsFilter: string[] | null
): boolean => !enabledToolsFilter || enabledToolsFilter.includes(toolName)

/**
 * Finds the original description for a tool from multiple sources
 */
const findOriginalDescription = (
  originalName: string,
  displayName: string,
  serverTools: Record<string, { description?: string }> | null,
  serverToolsMap: Record<string, Tool>,
  toolsMap: Record<string, Tool>
): string =>
  serverTools?.[originalName]?.description ||
  serverTools?.[displayName]?.description ||
  toolsMap[originalName]?.description ||
  serverToolsMap[originalName]?.description ||
  serverToolsMap[displayName]?.description ||
  ''

/**
 * Builds base tools (tools without name overrides) with metadata
 * Applies description overrides if they exist
 * All tools appear, but switches are enabled/disabled based on enabledToolsFilter allowlist
 */
const buildBaseTools = (
  toolsMap: Record<string, Tool>,
  nameOverrideKeys: Set<string>,
  overrideNames: Set<string>,
  enabledToolsFilter: string[] | null,
  serverTools: Record<string, { description?: string }> | null,
  serverToolsMap: Record<string, Tool>,
  toolsOverride: Record<string, V1ToolOverride> | null
): ToolWithMetadata[] =>
  Object.values(toolsMap)
    .filter((tool) => {
      // Exclude tools with name overrides (they'll be added as overridden tools)
      // All other tools appear, enabled state is set by isInitialEnabled
      return !shouldExcludeTool(tool.name, nameOverrideKeys, overrideNames)
    })
    .map((tool) => {
      const originalDescription = findOriginalDescription(
        tool.name,
        tool.name,
        serverTools,
        serverToolsMap,
        toolsMap
      )

      // Apply description override if it exists (and no name override)
      const override = toolsOverride?.[tool.name]
      const hasDescriptionOverride = override?.description !== undefined
      const description = hasDescriptionOverride
        ? (override.description ?? '')
        : tool.description || originalDescription || ''

      return {
        ...tool,
        description,
        isInitialEnabled: isToolInitiallyEnabled(tool.name, enabledToolsFilter),
        // If description is overridden, originalDescription is undefined (original is no longer available)
        originalDescription: hasDescriptionOverride
          ? undefined
          : originalDescription || undefined,
      }
    })

/**
 * Builds overridden tools with name overrides (only tools with name changes)
 */
const buildOverriddenTools = (
  toolsOverride: Record<string, V1ToolOverride>,
  toolsMap: Record<string, Tool>,
  serverTools: Record<string, { description?: string }> | null,
  serverToolsMap: Record<string, Tool>,
  enabledToolsFilter: string[] | null
): Map<string, ToolWithMetadata> => {
  const overriddenToolsMap = new Map<string, ToolWithMetadata>()

  Object.entries(toolsOverride).forEach(([originalName, override]) => {
    // Only process tools with name overrides
    if (!override.name) return

    const displayName = override.name

    // Skip if we've already processed this display name
    if (overriddenToolsMap.has(displayName)) return

    const hasDescriptionOverride = override.description !== undefined
    const originalDescription = hasDescriptionOverride
      ? undefined
      : findOriginalDescription(
          originalName,
          displayName,
          serverTools,
          serverToolsMap,
          toolsMap
        )

    overriddenToolsMap.set(displayName, {
      name: displayName,
      description: hasDescriptionOverride
        ? (override.description ?? '')
        : originalDescription || '',
      isInitialEnabled: isToolInitiallyEnabled(displayName, enabledToolsFilter),
      originalName,
      // If description is overridden, originalDescription is undefined (original is no longer available)
      originalDescription: originalDescription || undefined,
    })
  })

  return overriddenToolsMap
}

/**
 * Merges base tools and overridden tools, ensuring no duplicates
 */
const mergeTools = (
  baseTools: ToolWithMetadata[],
  overriddenTools: Map<string, ToolWithMetadata>,
  overrideNames: Set<string>
): Map<string, ToolWithMetadata> => {
  const mergedTools = new Map<string, ToolWithMetadata>()

  // Add base tools (excluding any that match override names)
  baseTools.forEach((tool) => {
    if (!overrideNames.has(tool.name)) {
      mergedTools.set(tool.name, tool)
    }
  })

  // Add overridden tools (will overwrite any duplicates by display name)
  overriddenTools.forEach((tool) => {
    mergedTools.set(tool.name, tool)
  })

  return mergedTools
}

/**
 * Sorts tools alphabetically by name
 */
const sortToolsByName = (tools: ToolWithMetadata[]): ToolWithMetadata[] =>
  [...tools].sort((a, b) => a.name.localeCompare(b.name))

/**
 * Builds a complete list of tools by merging registry tools, server tools, and applying overrides.
 * Handles filtering, deduplication, and tracking of original names/descriptions for overridden tools.
 */
export function buildToolsWithOverrides({
  registryTools,
  serverTools,
  toolsOverride,
  enabledToolsFilter,
}: BuildToolsWithOverridesParams): ToolWithMetadata[] {
  const toolsMap = createCombinedToolsMap(registryTools, serverTools)
  const serverToolsMap = createServerToolsMap(serverTools)

  const overrideNames = getOverrideNames(toolsOverride || null)
  const nameOverrideKeys = getNameOverrideKeys(toolsOverride || null)

  const baseTools = buildBaseTools(
    toolsMap,
    nameOverrideKeys,
    overrideNames,
    enabledToolsFilter || null,
    serverTools,
    serverToolsMap,
    toolsOverride || null
  )

  // Build overridden tools (only those with name overrides)
  const overriddenTools = toolsOverride
    ? buildOverriddenTools(
        toolsOverride,
        toolsMap,
        serverTools,
        serverToolsMap,
        enabledToolsFilter || null
      )
    : new Map<string, ToolWithMetadata>()

  const mergedTools = mergeTools(baseTools, overriddenTools, overrideNames)

  return sortToolsByName(Array.from(mergedTools.values()))
}
