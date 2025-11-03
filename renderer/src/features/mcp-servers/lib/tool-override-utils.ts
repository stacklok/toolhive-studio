import type { Tool, ToolOverride, ToolOverrides } from '../types/tool-override'

/**
 * Checks if there are pending override changes (including removals)
 */
export function hasOverrideChanges(
  toolsOverride: ToolOverrides,
  overrideTools: ToolOverrides | null | undefined
): boolean {
  const savedKeys = overrideTools ? Object.keys(overrideTools) : []
  const localKeys = Object.keys(toolsOverride)

  // Check if any saved override was removed (key exists in saved but not in local)
  const hasRemovals = savedKeys.some((key) => !(key in toolsOverride))
  if (hasRemovals) return true

  // Check if any local override differs from saved override
  for (const key of localKeys) {
    const saved = overrideTools?.[key]
    const local = toolsOverride[key]

    if (!local) continue

    // Compare the override objects
    if (!saved) {
      // New override added
      return true
    }

    // Compare name and description
    if (saved.name !== local.name || saved.description !== local.description) {
      return true
    }
  }

  return false
}

/**
 * Filters out overrides where both name and description are empty strings
 */
export function filterEmptyOverrides(overrides: ToolOverrides): ToolOverrides {
  return Object.entries(overrides).reduce<ToolOverrides>(
    (acc, [key, override]) => {
      const nameIsEmpty = override.name === ''
      const descriptionIsEmpty = override.description === ''

      // Remove the entire override entry only if both are explicitly empty strings
      // If at least one has a value (non-empty string) or is undefined, keep it
      if (!(nameIsEmpty && descriptionIsEmpty)) {
        acc[key] = override
      }
      return acc
    },
    {}
  )
}

/**
 * Determines the current description to show in the edit modal
 * Priority: local override > tool description > original description
 */
export function getCurrentDescription(
  tool: Tool,
  localOverride?: ToolOverride
): string {
  if (localOverride?.description !== undefined) {
    return localOverride.description
  }
  if (tool.description) {
    return tool.description
  }
  if (tool.originalDescription) {
    return tool.originalDescription
  }
  return ''
}

/**
 * Checks if there's an override description (either local unsaved or saved)
 */
export function hasOverrideDescription(
  localOverride?: ToolOverride,
  savedOverride?: ToolOverride
): boolean {
  return (
    (localOverride?.description !== undefined &&
      localOverride.description !== '') ||
    (savedOverride?.description !== undefined &&
      savedOverride.description !== '')
  )
}

/**
 * Gets the original name for a tool (used as the key for overrides)
 */
export function getOriginalToolName(tool: Tool): string {
  return tool.originalName || tool.name
}

/**
 * Gets the display name for a tool, considering local overrides
 * Priority: local override name > tool.name (which may include saved override)
 * Local overrides always take priority over saved overrides
 * When resetting to original (localOverride.name === originalName), it overrides saved override
 * When localOverride.name is empty string, show originalName if available
 */
export function getDisplayName(
  tool: Tool,
  localOverride?: ToolOverride
): string {
  // Local override takes priority (even if tool.name contains a saved override)
  // When resetting to original, localOverride.name will be set to originalName
  // which overrides the saved override stored in tool.name
  if (localOverride?.name !== undefined) {
    // If explicitly set to empty string, show originalName if available
    if (localOverride.name === '') {
      return tool.originalName || tool.name
    }
    return localOverride.name
  }
  // Fall back to tool.name (which may be from a saved override or original)
  return tool.name
}

/**
 * Gets the display description for a tool, considering local overrides
 * Priority: local override description > tool.description (which may include saved override)
 * Local overrides always take priority over saved overrides
 */
export function getDisplayDescription(
  tool: Tool,
  localOverride?: ToolOverride
): string {
  // Local override takes priority (even if tool.description contains a saved override)
  // Empty string is valid and should be shown
  if (localOverride?.description !== undefined) {
    return localOverride.description
  }
  // Fall back to tool.description (which may be from a saved override or original)
  return tool.description || ''
}

/**
 * Builds an override object from edited values, comparing against existing values
 * Returns undefined for fields that match the original (removes override)
 */
export function buildOverrideFromChanges(
  editedName: string,
  editedDescription: string,
  originalName: string,
  originalDescription: string,
  existingName: string,
  existingDescription: string
): ToolOverride {
  const override: ToolOverride = {}

  if (editedName !== existingName) {
    // If resetting to original name but there's a saved override, explicitly set it
    // to override the saved override. Otherwise, remove the override.
    if (editedName === originalName) {
      // If there's a saved override (existingName differs from original),
      // we need to explicitly set name to original to override the saved one
      override.name = existingName !== originalName ? originalName : undefined
    } else {
      override.name = editedName
    }
  }

  if (editedDescription !== existingDescription) {
    // If resetting to original description but there's a saved override, explicitly set it
    // to override the saved override. Otherwise, remove the override.
    if (editedDescription === originalDescription) {
      // If there's a saved override (existingDescription differs from original),
      // we need to explicitly set description to original to override the saved one
      override.description =
        existingDescription !== originalDescription
          ? originalDescription
          : undefined
    } else {
      override.description = editedDescription
    }
  }

  return override
}

/**
 * Determines if a field should be preserved from previous local override
 * Only preserves if it's different from the saved override (i.e., it's a local change)
 */
function shouldPreserveField(
  prevValue: string | undefined,
  savedValue: string | undefined
): boolean {
  return savedValue === undefined || prevValue !== savedValue
}

/**
 * Merges a single field (name or description) from new override, previous local override, or existing override
 * @param fieldWasChanged - whether the field was explicitly changed in this edit
 * @param newValue - the new value (if fieldWasChanged is true, undefined means explicit removal)
 * @param prevLocalValue - previous local override value
 * @param existingValue - existing saved override value
 * @param hasAnyChanges - whether there are any changes in this edit (used to determine if we should preserve existing fields)
 */
function mergeField(
  fieldWasChanged: boolean,
  newValue: string | undefined,
  prevLocalValue: string | undefined,
  existingValue: string | undefined,
  hasAnyChanges: boolean
): string | undefined {
  // If field was changed in this edit, use the new value (or undefined to explicitly remove)
  if (fieldWasChanged) {
    return newValue
  }

  // Field wasn't changed - preserve previous local value if it exists and differs from saved
  // This should happen even if there are no other changes (prevLocalOverride needs to be preserved)
  if (prevLocalValue !== undefined) {
    const shouldPreserve = shouldPreserveField(prevLocalValue, existingValue)
    if (shouldPreserve) {
      return prevLocalValue
    }
    // If prevLocalValue is same as existingValue and there are other changes,
    // we still need to preserve it because we're updating the override
    // This happens when toolsOverride was initialized from overrideTools
    if (hasAnyChanges && existingValue !== undefined) {
      return existingValue
    }
    // If prevLocalValue is same as existingValue and no other changes, return undefined
    // to avoid creating redundant override
    return undefined
  }

  // If no previous local value but there's an existing saved override, preserve it
  // only if there are other changes (to avoid preserving saved overrides when nothing changed)
  if (hasAnyChanges && existingValue !== undefined) {
    return existingValue
  }

  return undefined
}

/**
 * Merges a new override with previous local overrides
 * Includes fields that changed in this edit, were changed earlier in this session,
 * or exist in the saved override (to preserve them when creating a new local override)
 */
export function mergeToolOverride(
  newOverride: ToolOverride,
  prevLocalOverride: ToolOverride | undefined,
  existingOverride: ToolOverride | undefined
): ToolOverride | null {
  const hasChanges = Object.keys(newOverride).length > 0

  const name = mergeField(
    'name' in newOverride,
    newOverride.name,
    prevLocalOverride?.name,
    existingOverride?.name,
    hasChanges
  )

  const description = mergeField(
    'description' in newOverride,
    newOverride.description,
    prevLocalOverride?.description,
    existingOverride?.description,
    hasChanges
  )

  // Build merged object conditionally, only including defined fields
  const merged: ToolOverride = {
    ...(name !== undefined && { name }),
    ...(description !== undefined && { description }),
  }

  // If merged object is empty, return null to indicate removal
  return Object.keys(merged).length === 0 ? null : merged
}

/**
 * Creates initial enabled tools state from tools array
 */
export function createInitialEnabledTools(
  tools: Tool[]
): Record<string, boolean> {
  return tools.reduce(
    (acc, tool) => ({ ...acc, [tool.name]: tool.isInitialEnabled ?? true }),
    {}
  )
}

/**
 * Checks if a tool has any overrides (local or saved)
 * For tools with name overrides, the override is stored under the original name
 * For tools with only description overrides, the override is stored under the tool name
 */
export function hasOverride(
  tool: Tool,
  toolsOverride: ToolOverrides,
  overrideTools?: ToolOverrides | null
): boolean {
  const overrideKey = tool.originalName || tool.name

  const localOverride = toolsOverride[overrideKey]
  const savedOverride = overrideTools?.[overrideKey]

  // Has override if:
  // 1. Tool has a name override (indicated by originalName), OR
  // 2. There's a local or saved override with name, OR
  // 3. There's a local or saved override with description
  return (
    !!tool.originalName ||
    localOverride?.name !== undefined ||
    savedOverride?.name !== undefined ||
    localOverride?.description !== undefined ||
    savedOverride?.description !== undefined
  )
}

/**
 * Checks if a tool has only local (unsaved) overrides
 * For tools with name overrides, the override is stored under the original name
 * For tools with only description overrides, the override is stored under the tool name
 */
export function isLocalOverrideOnly(
  tool: Tool,
  toolsOverride: ToolOverrides,
  overrideTools?: ToolOverrides | null
): boolean {
  const overrideKey = tool.originalName || tool.name

  const localOverride = toolsOverride[overrideKey]
  const savedOverride = overrideTools?.[overrideKey]

  // No local override means no unsaved changes
  if (!localOverride) {
    return false
  }

  // If there's no saved override, then local override is new (unsaved)
  if (!savedOverride) {
    return true
  }

  // Compare local and saved overrides - if they differ, there are unsaved changes
  return (
    savedOverride.name !== localOverride.name ||
    savedOverride.description !== localOverride.description
  )
}
