import { describe, it, expect } from 'vitest'
import {
  hasOverrideChanges,
  filterEmptyOverrides,
  getCurrentDescription,
  hasOverrideDescription,
  getOriginalToolName,
  buildOverrideFromChanges,
  mergeToolOverride,
  createInitialEnabledTools,
} from '../tool-override-utils'
import type {
  Tool,
  ToolOverride,
  ToolOverrides,
} from '../../types/tool-override'

describe('tool-override-utils', () => {
  describe('hasOverrideChanges', () => {
    it('returns false when no overrides exist', () => {
      expect(hasOverrideChanges({}, null)).toBe(false)
      expect(hasOverrideChanges({}, undefined)).toBe(false)
      expect(hasOverrideChanges({}, {})).toBe(false)
    })

    it('returns true when saved override is removed', () => {
      const toolsOverride: ToolOverrides = {}
      const overrideTools: ToolOverrides = { fetch: { name: 'fetch_custom' } }

      expect(hasOverrideChanges(toolsOverride, overrideTools)).toBe(true)
    })

    it('returns true when new override is added', () => {
      const toolsOverride: ToolOverrides = { fetch: { name: 'fetch_custom' } }
      const overrideTools: ToolOverrides = {}

      expect(hasOverrideChanges(toolsOverride, overrideTools)).toBe(true)
    })

    it('returns true when override name changes', () => {
      const toolsOverride: ToolOverrides = { fetch: { name: 'fetch_new' } }
      const overrideTools: ToolOverrides = { fetch: { name: 'fetch_old' } }

      expect(hasOverrideChanges(toolsOverride, overrideTools)).toBe(true)
    })

    it('returns true when override description changes', () => {
      const toolsOverride: ToolOverrides = {
        fetch: { description: 'New description' },
      }
      const overrideTools: ToolOverrides = {
        fetch: { description: 'Old description' },
      }

      expect(hasOverrideChanges(toolsOverride, overrideTools)).toBe(true)
    })

    it('returns false when overrides are identical', () => {
      const toolsOverride: ToolOverrides = {
        fetch: { name: 'fetch_custom', description: 'Custom' },
      }
      const overrideTools: ToolOverrides = {
        fetch: { name: 'fetch_custom', description: 'Custom' },
      }

      expect(hasOverrideChanges(toolsOverride, overrideTools)).toBe(false)
    })

    it('returns true when only name differs', () => {
      const toolsOverride: ToolOverrides = { fetch: { name: 'fetch_custom' } }
      const overrideTools: ToolOverrides = { fetch: { description: 'Custom' } }

      expect(hasOverrideChanges(toolsOverride, overrideTools)).toBe(true)
    })

    it('returns true when only description differs', () => {
      const toolsOverride: ToolOverrides = {
        fetch: { description: 'New description' },
      }
      const overrideTools: ToolOverrides = { fetch: { name: 'fetch_custom' } }

      expect(hasOverrideChanges(toolsOverride, overrideTools)).toBe(true)
    })
  })

  describe('filterEmptyOverrides', () => {
    it('returns empty object when input is empty', () => {
      expect(filterEmptyOverrides({})).toEqual({})
    })

    it('keeps overrides with name only', () => {
      const overrides: ToolOverrides = {
        fetch: { name: 'fetch_custom' },
      }

      expect(filterEmptyOverrides(overrides)).toEqual(overrides)
    })

    it('keeps overrides with description only', () => {
      const overrides: ToolOverrides = {
        fetch: { description: 'Custom description' },
      }

      expect(filterEmptyOverrides(overrides)).toEqual(overrides)
    })

    it('keeps overrides with both name and description', () => {
      const overrides: ToolOverrides = {
        fetch: { name: 'fetch_custom', description: 'Custom description' },
      }

      expect(filterEmptyOverrides(overrides)).toEqual(overrides)
    })

    it('filters out overrides where both name and description are empty strings', () => {
      const overrides: ToolOverrides = {
        fetch: { name: '', description: '' },
        other: { name: 'other_custom' },
      }

      const result = filterEmptyOverrides(overrides)

      expect(result).toEqual({ other: { name: 'other_custom' } })
      expect(result.fetch).toBeUndefined()
    })

    it('keeps override with empty name but non-empty description', () => {
      const overrides: ToolOverrides = {
        fetch: { name: '', description: 'Description' },
      }

      expect(filterEmptyOverrides(overrides)).toEqual(overrides)
    })

    it('keeps override with empty description but non-empty name', () => {
      const overrides: ToolOverrides = {
        fetch: { name: 'fetch_custom', description: '' },
      }

      expect(filterEmptyOverrides(overrides)).toEqual(overrides)
    })

    it('keeps override with undefined values', () => {
      const overrides: ToolOverrides = {
        fetch: { name: undefined, description: undefined },
      }

      expect(filterEmptyOverrides(overrides)).toEqual(overrides)
    })
  })

  describe('getCurrentDescription', () => {
    it('returns local override description when present', () => {
      const tool: Tool = {
        name: 'fetch',
        description: 'Tool description',
        originalDescription: 'Original description',
      }
      const localOverride: ToolOverride = {
        description: 'Local override description',
      }

      expect(getCurrentDescription(tool, localOverride)).toBe(
        'Local override description'
      )
    })

    it('returns tool description when no local override', () => {
      const tool: Tool = {
        name: 'fetch',
        description: 'Tool description',
        originalDescription: 'Original description',
      }

      expect(getCurrentDescription(tool)).toBe('Tool description')
    })

    it('returns original description when tool description is empty', () => {
      const tool: Tool = {
        name: 'fetch',
        originalDescription: 'Original description',
      }

      expect(getCurrentDescription(tool)).toBe('Original description')
    })

    it('returns empty string when no description available', () => {
      const tool: Tool = {
        name: 'fetch',
      }

      expect(getCurrentDescription(tool)).toBe('')
    })

    it('prioritizes local override over tool description', () => {
      const tool: Tool = {
        name: 'fetch',
        description: 'Tool description',
      }
      const localOverride: ToolOverride = { description: 'Local override' }

      expect(getCurrentDescription(tool, localOverride)).toBe('Local override')
    })

    it('handles empty string in local override', () => {
      const tool: Tool = {
        name: 'fetch',
        description: 'Tool description',
      }
      const localOverride: ToolOverride = { description: '' }

      expect(getCurrentDescription(tool, localOverride)).toBe('')
    })
  })

  describe('hasOverrideDescription', () => {
    it('returns false when no overrides provided', () => {
      expect(hasOverrideDescription()).toBe(false)
    })

    it('returns true when local override has description', () => {
      const localOverride: ToolOverride = { description: 'Custom description' }

      expect(hasOverrideDescription(localOverride)).toBe(true)
    })

    it('returns true when saved override has description', () => {
      const savedOverride: ToolOverride = { description: 'Custom description' }

      expect(hasOverrideDescription(undefined, savedOverride)).toBe(true)
    })

    it('returns true when both have descriptions', () => {
      const localOverride: ToolOverride = { description: 'Local description' }
      const savedOverride: ToolOverride = { description: 'Saved description' }

      expect(hasOverrideDescription(localOverride, savedOverride)).toBe(true)
    })

    it('returns false when description is empty string', () => {
      const localOverride: ToolOverride = { description: '' }
      const savedOverride: ToolOverride = { description: '' }

      expect(hasOverrideDescription(localOverride, savedOverride)).toBe(false)
    })

    it('returns false when description is undefined', () => {
      const localOverride: ToolOverride = { name: 'fetch_custom' }
      const savedOverride: ToolOverride = { name: 'fetch_custom' }

      expect(hasOverrideDescription(localOverride, savedOverride)).toBe(false)
    })

    it('returns true when local has empty string but saved has description', () => {
      const localOverride: ToolOverride = { description: '' }
      const savedOverride: ToolOverride = { description: 'Saved description' }

      expect(hasOverrideDescription(localOverride, savedOverride)).toBe(true)
    })
  })

  describe('getOriginalToolName', () => {
    it('returns originalName when present', () => {
      const tool: Tool = {
        name: 'fetch_custom',
        originalName: 'fetch',
      }

      expect(getOriginalToolName(tool)).toBe('fetch')
    })

    it('returns name when originalName is not present', () => {
      const tool: Tool = {
        name: 'fetch',
      }

      expect(getOriginalToolName(tool)).toBe('fetch')
    })

    it('returns name when originalName is undefined', () => {
      const tool: Tool = {
        name: 'fetch',
        originalName: undefined,
      }

      expect(getOriginalToolName(tool)).toBe('fetch')
    })
  })

  describe('buildOverrideFromChanges', () => {
    it('returns empty object when no changes', () => {
      const result = buildOverrideFromChanges(
        'fetch',
        'Original description',
        'fetch',
        'Original description',
        'fetch',
        'Original description'
      )

      expect(result).toEqual({})
    })

    it('includes name when name changes', () => {
      const result = buildOverrideFromChanges(
        'fetch_custom',
        'Original description',
        'fetch',
        'Original description',
        'fetch',
        'Original description'
      )

      expect(result).toEqual({ name: 'fetch_custom' })
    })

    it('includes description when description changes', () => {
      const result = buildOverrideFromChanges(
        'fetch',
        'Custom description',
        'fetch',
        'Original description',
        'fetch',
        'Original description'
      )

      expect(result).toEqual({ description: 'Custom description' })
    })

    it('includes both when both change', () => {
      const result = buildOverrideFromChanges(
        'fetch_custom',
        'Custom description',
        'fetch',
        'Original description',
        'fetch',
        'Original description'
      )

      expect(result).toEqual({
        name: 'fetch_custom',
        description: 'Custom description',
      })
    })

    it('stores original name when resetting to original with saved override', () => {
      // When resetting to original name but there's a saved override (existingName !== originalName),
      // we need to explicitly store the original name to override the saved one
      const result = buildOverrideFromChanges(
        'fetch', // editedName: resetting to original
        'Custom description',
        'fetch', // originalName
        'Original description',
        'fetch_custom', // existingName: saved override exists
        'Original description'
      )

      // Should store original name to override the saved override
      expect(result).toEqual({
        name: 'fetch',
        description: 'Custom description',
      })
    })

    it('sets name to undefined when resetting to original without saved override', () => {
      // When resetting to original and there's no saved override (existingName === originalName),
      // we remove the override
      const result = buildOverrideFromChanges(
        'fetch', // editedName: resetting to original
        'Custom description',
        'fetch', // originalName
        'Original description',
        'fetch', // existingName: no saved override
        'Original description'
      )

      expect(result).toEqual({
        name: undefined,
        description: 'Custom description',
      })
    })

    it('stores original description when resetting to original with saved override', () => {
      // When resetting to original description but there's a saved override,
      // we need to explicitly store the original description to override the saved one
      const result = buildOverrideFromChanges(
        'fetch_custom',
        'Original description', // editedDescription: resetting to original
        'fetch',
        'Original description', // originalDescription
        'fetch_custom',
        'Custom description' // existingDescription: saved override exists
      )

      // Should store original description to override the saved override
      expect(result).toEqual({ description: 'Original description' })
    })

    it('sets description to undefined when resetting to original without saved override', () => {
      // When resetting to original and there's no saved override,
      // we remove the override
      const result = buildOverrideFromChanges(
        'fetch_custom',
        'Original description', // editedDescription: resetting to original
        'fetch',
        'Original description', // originalDescription
        'fetch_custom',
        'Original description' // existingDescription: no saved override
      )

      // Name didn't change (editedName === existingName), so it's not included
      // Description changed and equals original with no saved override, so it's set to undefined
      expect(result).toEqual({ description: undefined })
    })

    it('handles empty string as change', () => {
      const result = buildOverrideFromChanges(
        '',
        '',
        'fetch',
        'Original description',
        'fetch',
        'Original description'
      )

      // Empty strings differ from existing values, so they're included as empty strings
      // Empty strings don't equal original values, so they're not set to undefined
      expect(result).toEqual({ name: '', description: '' })
    })
  })

  describe('mergeToolOverride', () => {
    it('returns null when merged object is empty', () => {
      const result = mergeToolOverride({}, undefined, undefined)

      expect(result).toBeNull()
    })

    it('includes new name override when field was changed', () => {
      const newOverride: ToolOverride = { name: 'fetch_custom' }

      const result = mergeToolOverride(newOverride, undefined, undefined)

      expect(result).toEqual({ name: 'fetch_custom' })
    })

    it('includes new description override when field was changed', () => {
      const newOverride: ToolOverride = { description: 'Custom description' }

      const result = mergeToolOverride(newOverride, undefined, undefined)

      expect(result).toEqual({ description: 'Custom description' })
    })

    it('includes both name and description when both changed', () => {
      const newOverride: ToolOverride = {
        name: 'fetch_custom',
        description: 'Custom description',
      }

      const result = mergeToolOverride(newOverride, undefined, undefined)

      expect(result).toEqual({
        name: 'fetch_custom',
        description: 'Custom description',
      })
    })

    it('removes name when explicitly set to undefined', () => {
      const newOverride: ToolOverride = { name: undefined }
      const prevLocalOverride: ToolOverride = { name: 'fetch_custom' }

      const result = mergeToolOverride(
        newOverride,
        prevLocalOverride,
        undefined
      )

      expect(result).toBeNull()
    })

    it('preserves previous local name when not changed and different from saved', () => {
      const newOverride: ToolOverride = {}
      const prevLocalOverride: ToolOverride = { name: 'fetch_local' }
      const existingOverride: ToolOverride = { name: 'fetch_saved' }

      const result = mergeToolOverride(
        newOverride,
        prevLocalOverride,
        existingOverride
      )

      expect(result).toEqual({ name: 'fetch_local' })
    })

    it('does not preserve previous local name when same as saved', () => {
      const newOverride: ToolOverride = {}
      const prevLocalOverride: ToolOverride = { name: 'fetch_saved' }
      const existingOverride: ToolOverride = { name: 'fetch_saved' }

      const result = mergeToolOverride(
        newOverride,
        prevLocalOverride,
        existingOverride
      )

      expect(result).toBeNull()
    })

    it('preserves previous local description when not changed and different from saved', () => {
      const newOverride: ToolOverride = {}
      const prevLocalOverride: ToolOverride = {
        description: 'Local description',
      }
      const existingOverride: ToolOverride = {
        description: 'Saved description',
      }

      const result = mergeToolOverride(
        newOverride,
        prevLocalOverride,
        existingOverride
      )

      expect(result).toEqual({ description: 'Local description' })
    })

    it('merges new name with preserved previous description', () => {
      const newOverride: ToolOverride = { name: 'fetch_new' }
      const prevLocalOverride: ToolOverride = {
        description: 'Local description',
      }
      const existingOverride: ToolOverride = {
        description: 'Saved description',
      }

      const result = mergeToolOverride(
        newOverride,
        prevLocalOverride,
        existingOverride
      )

      expect(result).toEqual({
        name: 'fetch_new',
        description: 'Local description',
      })
    })

    it('preserves previous local override when no saved override exists', () => {
      const newOverride: ToolOverride = {}
      const prevLocalOverride: ToolOverride = { name: 'fetch_local' }

      const result = mergeToolOverride(
        newOverride,
        prevLocalOverride,
        undefined
      )

      expect(result).toEqual({ name: 'fetch_local' })
    })

    it('prioritizes new override over previous local override', () => {
      const newOverride: ToolOverride = { name: 'fetch_new' }
      const prevLocalOverride: ToolOverride = { name: 'fetch_old' }

      const result = mergeToolOverride(
        newOverride,
        prevLocalOverride,
        undefined
      )

      expect(result).toEqual({ name: 'fetch_new' })
    })
  })

  describe('createInitialEnabledTools', () => {
    it('returns empty object when no tools provided', () => {
      expect(createInitialEnabledTools([])).toEqual({})
    })

    it('sets tools to enabled by default', () => {
      const tools: Tool[] = [{ name: 'tool1' }, { name: 'tool2' }]

      const result = createInitialEnabledTools(tools)

      expect(result).toEqual({
        tool1: true,
        tool2: true,
      })
    })

    it('respects isInitialEnabled when provided', () => {
      const tools: Tool[] = [
        { name: 'tool1', isInitialEnabled: true },
        { name: 'tool2', isInitialEnabled: false },
        { name: 'tool3' },
      ]

      const result = createInitialEnabledTools(tools)

      expect(result).toEqual({
        tool1: true,
        tool2: false,
        tool3: true,
      })
    })

    it('handles tools with all properties', () => {
      const tools: Tool[] = [
        {
          name: 'fetch',
          description: 'Fetch description',
          isInitialEnabled: false,
          originalName: 'fetch',
          originalDescription: 'Original description',
        },
      ]

      const result = createInitialEnabledTools(tools)

      expect(result).toEqual({
        fetch: false,
      })
    })
  })
})
