import { describe, it, expect } from 'vitest'
import { buildToolsWithOverrides } from '../build-tools-with-overrides'

describe('buildToolsWithOverrides', () => {
  describe('basic functionality', () => {
    it('returns empty array when no tools provided', () => {
      const result = buildToolsWithOverrides({
        registryTools: [],
        serverTools: null,
        toolsOverride: null,
        enabledToolsFilter: null,
      })

      expect(result).toEqual([])
    })

    it('returns registry tools when no server tools or overrides', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['tool1', 'tool2'],
        serverTools: null,
        toolsOverride: null,
        enabledToolsFilter: null,
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        name: 'tool1',
        description: '',
        isInitialEnabled: true,
      })
      expect(result[1]).toMatchObject({
        name: 'tool2',
        description: '',
        isInitialEnabled: true,
      })
    })

    it('merges registry and server tools', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['tool1', 'tool2'],
        serverTools: {
          tool1: { description: 'Tool 1 description' },
          tool2: { description: 'Tool 2 description' },
        },
        toolsOverride: null,
        enabledToolsFilter: null,
      })

      expect(result).toHaveLength(2)
      expect(result.find((t) => t.name === 'tool1')).toMatchObject({
        name: 'tool1',
        description: 'Tool 1 description',
      })
      expect(result.find((t) => t.name === 'tool2')).toMatchObject({
        name: 'tool2',
        description: 'Tool 2 description',
      })
    })

    it('sorts tools alphabetically', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['zebra', 'apple', 'banana'],
        serverTools: null,
        toolsOverride: null,
        enabledToolsFilter: null,
      })

      expect(result.map((t) => t.name)).toEqual(['apple', 'banana', 'zebra'])
    })
  })

  describe('enabled tools filter', () => {
    it('marks tools as enabled when filter is null', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['tool1', 'tool2'],
        serverTools: null,
        toolsOverride: null,
        enabledToolsFilter: null,
      })

      expect(result.every((t) => t.isInitialEnabled)).toBe(true)
    })

    it('marks tools as enabled based on filter', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['tool1', 'tool2', 'tool3'],
        serverTools: null,
        toolsOverride: null,
        enabledToolsFilter: ['tool1', 'tool3'],
      })

      expect(result.find((t) => t.name === 'tool1')?.isInitialEnabled).toBe(
        true
      )
      expect(result.find((t) => t.name === 'tool2')?.isInitialEnabled).toBe(
        false
      )
      expect(result.find((t) => t.name === 'tool3')?.isInitialEnabled).toBe(
        true
      )
    })
  })

  describe('tool overrides', () => {
    it('applies name override', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['fetch'],
        serverTools: {
          fetch_custom: { description: 'Fetches a URL' },
        },
        toolsOverride: {
          fetch: { name: 'fetch_custom' },
        },
        enabledToolsFilter: null,
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        name: 'fetch_custom',
        description: 'Fetches a URL',
        originalName: 'fetch',
        isInitialEnabled: true,
      })
    })

    it('applies description override', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['fetch'],
        serverTools: {
          fetch: { description: 'Custom description' },
        },
        toolsOverride: {
          fetch: { description: 'Custom description' },
        },
        enabledToolsFilter: null,
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        name: 'fetch',
        description: 'Custom description',
        originalDescription: undefined, // Original description is no longer available when override is applied
      })
      // originalName is only set for tools with name overrides, not description-only overrides
      expect(result[0]?.originalName).toBeUndefined()
    })

    it('applies both name and description override', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['fetch'],
        serverTools: {
          fetch_custom: { description: 'Custom description' },
        },
        toolsOverride: {
          fetch: {
            name: 'fetch_custom',
            description: 'Custom description',
          },
        },
        enabledToolsFilter: null,
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        name: 'fetch_custom',
        description: 'Custom description',
        originalName: 'fetch',
        originalDescription: undefined, // Original description is no longer available when override is applied
      })
    })

    it('excludes original tool when override exists', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['fetch', 'make_dir'],
        serverTools: {
          fetch_custom: { description: 'Fetches a URL' },
          make_dir: { description: 'Makes a directory' },
        },
        toolsOverride: {
          fetch: { name: 'fetch_custom' },
        },
        enabledToolsFilter: null,
      })

      expect(result).toHaveLength(2)
      expect(result.find((t) => t.name === 'fetch')).toBeUndefined()
      expect(result.find((t) => t.name === 'fetch_custom')).toBeDefined()
      expect(result.find((t) => t.name === 'make_dir')).toBeDefined()
    })

    it('filters out tools in registryTools that match override display names', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['fetch', 'fetch_custom', 'make_dir'],
        serverTools: {
          fetch_custom: { description: 'Custom fetch tool' },
          make_dir: { description: 'Makes a directory' },
        },
        toolsOverride: {
          fetch: { name: 'fetch_custom' },
        },
        enabledToolsFilter: null,
      })

      // fetch_custom in registryTools should be filtered out (matches override display name)
      // Only the overridden fetch_custom should appear
      expect(result).toHaveLength(2)
      expect(result.find((t) => t.name === 'fetch')).toBeUndefined()
      const fetchCustomTool = result.find((t) => t.name === 'fetch_custom')
      expect(fetchCustomTool).toBeDefined()
      expect(fetchCustomTool?.originalName).toBe('fetch') // Should be the overridden version
      expect(result.find((t) => t.name === 'make_dir')).toBeDefined()
    })

    it('tracks description from serverTools when override name exists', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['fetch'],
        serverTools: {
          fetch_custom: { description: 'Description from server' },
        },
        toolsOverride: {
          fetch: { name: 'fetch_custom' },
        },
        enabledToolsFilter: null,
      })

      expect(result[0]).toMatchObject({
        name: 'fetch_custom',
        originalName: 'fetch',
        originalDescription: 'Description from server',
      })
    })

    it('uses override description when provided', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['fetch'],
        serverTools: {
          fetch_custom: { description: 'Override description' },
        },
        toolsOverride: {
          fetch: {
            name: 'fetch_custom',
            description: 'Override description',
          },
        },
        enabledToolsFilter: null,
      })

      expect(result[0]).toMatchObject({
        name: 'fetch_custom',
        description: 'Override description',
        originalDescription: undefined, // Original description is no longer available when override is applied
      })
    })

    it('handles empty override description', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['fetch'],
        serverTools: {
          fetch: { description: '' },
        },
        toolsOverride: {
          fetch: { description: '' },
        },
        enabledToolsFilter: null,
      })

      expect(result[0]).toMatchObject({
        name: 'fetch',
        description: '',
        originalDescription: undefined, // Original description is no longer available when override is applied
      })
    })

    it('handles empty override name', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['fetch'],
        serverTools: {
          fetch: { description: 'Original description' },
        },
        toolsOverride: {
          fetch: { name: '' },
        },
        enabledToolsFilter: null,
      })

      // Empty name override is falsy, so tool appears as base tool (not overridden)
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        name: 'fetch',
      })
      // originalName is only set for tools with name overrides, empty string is treated as no override
      expect(result[0]?.originalName).toBeUndefined()
    })
  })

  describe('description fallback chain', () => {
    it('prefers serverTools description over registry', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['fetch'],
        serverTools: {
          fetch_custom: { description: 'Server description' },
        },
        toolsOverride: {
          fetch: { name: 'fetch_custom' },
        },
        enabledToolsFilter: null,
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.originalDescription).toBe('Server description')
    })

    it('fallbacks to empty string when no description available', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['fetch'],
        serverTools: null,
        toolsOverride: {
          fetch: { name: 'fetch_custom' },
        },
        enabledToolsFilter: null,
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.description).toBe('')
      expect(result[0]?.originalDescription).toBeUndefined()
    })
  })

  describe('enabled filter with overrides', () => {
    it('uses override name for enabled filter check', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['fetch'],
        serverTools: {
          fetch_custom: { description: 'Fetches a URL' },
        },
        toolsOverride: {
          fetch: { name: 'fetch_custom' },
        },
        enabledToolsFilter: ['fetch_custom'], // Using override name
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.isInitialEnabled).toBe(true)
    })

    it('shows tool as disabled when override name not in filter', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['fetch'],
        serverTools: {
          fetch_custom: { description: 'Fetches a URL' },
        },
        toolsOverride: {
          fetch: { name: 'fetch_custom' },
        },
        enabledToolsFilter: ['fetch'], // Filter contains original name, but tool is now fetch_custom
      })

      // Tool should appear but be disabled because override name is not in filter
      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('fetch_custom')
      expect(result[0]?.isInitialEnabled).toBe(false)
    })

    it('shows tool as disabled when override name not in filter', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['fetch'],
        serverTools: {
          fetch_custom: { description: 'Fetches a URL' },
        },
        toolsOverride: {
          fetch: { name: 'fetch_custom' },
        },
        enabledToolsFilter: ['other_tool'], // Filter doesn't contain override name
      })

      // Tool should appear but be disabled because override name is not in filter
      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('fetch_custom')
      expect(result[0]?.isInitialEnabled).toBe(false)
    })
  })

  describe('duplicate handling', () => {
    it('handles multiple overrides with same display name', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['fetch', 'fetch2'],
        serverTools: {
          fetch_custom: { description: 'Fetch 1' },
        },
        toolsOverride: {
          fetch: { name: 'fetch_custom' },
          fetch2: { name: 'fetch_custom' }, // Same display name
        },
        enabledToolsFilter: null,
      })

      // Should only have one tool with display name 'fetch_custom'
      const customTools = result.filter((t) => t.name === 'fetch_custom')
      expect(customTools).toHaveLength(1)
    })

    it('prioritizes first override when duplicates exist', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['fetch', 'fetch2'],
        serverTools: {
          fetch_custom: { description: 'First fetch' },
        },
        toolsOverride: {
          fetch: { name: 'fetch_custom' },
          fetch2: { name: 'fetch_custom' },
        },
        enabledToolsFilter: null,
      })

      const customTool = result.find((t) => t.name === 'fetch_custom')
      expect(customTool?.originalName).toBe('fetch')
    })
  })

  describe('edge cases', () => {
    it('handles undefined toolsOverride', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['tool1'],
        serverTools: null,
        toolsOverride: undefined,
        enabledToolsFilter: null,
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('tool1')
    })

    it('handles undefined enabledToolsFilter', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['tool1'],
        serverTools: null,
        toolsOverride: null,
        enabledToolsFilter: undefined,
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.isInitialEnabled).toBe(true)
    })

    it('handles server tools with missing descriptions', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['tool1'],
        serverTools: {
          tool1: {},
        },
        toolsOverride: null,
        enabledToolsFilter: null,
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.description).toBe('')
    })

    it('handles multiple overrides correctly', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['fetch', 'make_dir'],
        serverTools: {
          fetch_custom: { description: 'Fetches a URL' },
          make_dir: { description: 'Custom make dir description' },
        },
        toolsOverride: {
          fetch: { name: 'fetch_custom' },
          make_dir: { description: 'Custom make dir description' },
        },
        enabledToolsFilter: null,
      })

      expect(result).toHaveLength(2)
      expect(result.find((t) => t.name === 'fetch_custom')).toBeDefined()
      expect(result.find((t) => t.name === 'make_dir')?.description).toBe(
        'Custom make dir description'
      )
    })
  })

  describe('drift scenarios', () => {
    it('handles drift when registry tool is not in serverTools', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['tool1', 'tool2'],
        serverTools: {
          tool1: { description: 'Tool 1 description' },
          // tool2 is in registry but not in serverTools (drift from running server)
        },
        toolsOverride: null,
        enabledToolsFilter: null,
      })

      expect(result).toHaveLength(2)
      expect(result.find((t) => t.name === 'tool1')).toMatchObject({
        name: 'tool1',
        description: 'Tool 1 description',
      })
      expect(result.find((t) => t.name === 'tool2')).toMatchObject({
        name: 'tool2',
        description: '', // No description from serverTools - drift detected
      })
    })

    it('handles drift when serverTools has tools not in registryTools', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['tool1'],
        serverTools: {
          tool1: { description: 'Tool 1 description' },
          tool2: { description: 'Tool 2 from server' }, // Not in registry - drift
        },
        toolsOverride: null,
        enabledToolsFilter: null,
      })

      // Both tools should appear (serverTools drift)
      expect(result).toHaveLength(2)
      expect(result.find((t) => t.name === 'tool1')).toMatchObject({
        name: 'tool1',
        description: 'Tool 1 description',
      })
      expect(result.find((t) => t.name === 'tool2')).toMatchObject({
        name: 'tool2',
        description: 'Tool 2 from server',
      })
    })

    it('handles drift with multiple registry tools missing from serverTools', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['tool1', 'tool2', 'tool3'],
        serverTools: {
          tool1: { description: 'Tool 1 description' },
          // tool2 and tool3 are missing - drift detected
        },
        toolsOverride: null,
        enabledToolsFilter: null,
      })

      expect(result).toHaveLength(3)
      expect(result.find((t) => t.name === 'tool1')?.description).toBe(
        'Tool 1 description'
      )
      expect(result.find((t) => t.name === 'tool2')?.description).toBe('')
      expect(result.find((t) => t.name === 'tool3')?.description).toBe('')
    })

    it('handles drift when override name exists in serverTools but not in registry', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['fetch'],
        serverTools: {
          fetch_custom: { description: 'Custom fetch from server' },
          unknown_tool: { description: 'Unknown tool from server' }, // Not in registry or override
        },
        toolsOverride: {
          fetch: { name: 'fetch_custom' },
        },
        enabledToolsFilter: null,
      })

      // fetch_custom (overridden) should appear, unknown_tool (drift) should also appear
      expect(result.length).toBeGreaterThanOrEqual(2)
      expect(result.find((t) => t.name === 'fetch_custom')).toBeDefined()
      expect(result.find((t) => t.name === 'unknown_tool')).toBeDefined()
    })

    it('handles drift with filter applied - registry tool missing but filter includes it', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['tool1', 'tool2'],
        serverTools: {
          tool1: { description: 'Tool 1 description' },
          // tool2 is in registry and filter but not in serverTools - drift
        },
        toolsOverride: null,
        enabledToolsFilter: ['tool1', 'tool2'],
      })

      expect(result).toHaveLength(2)
      expect(result.find((t) => t.name === 'tool1')?.isInitialEnabled).toBe(
        true
      )
      expect(result.find((t) => t.name === 'tool2')?.isInitialEnabled).toBe(
        true
      )
      expect(result.find((t) => t.name === 'tool2')?.description).toBe('')
    })
  })

  describe('integration scenarios', () => {
    it('handles complex scenario with multiple tools and overrides', () => {
      const result = buildToolsWithOverrides({
        registryTools: ['edit_file', 'make_dir', 'fetch'],
        serverTools: {
          my_edit_file: { description: 'Edit a file' },
          make_dir: { description: 'Make a directory' },
          fetch_custom: { description: 'Custom fetch description' },
        },
        toolsOverride: {
          edit_file: { name: 'my_edit_file' },
          fetch: {
            name: 'fetch_custom',
            description: 'Custom fetch description',
          },
        },
        enabledToolsFilter: ['my_edit_file', 'make_dir'], // Filter uses override names
      })

      expect(result).toHaveLength(3) // All tools appear

      const editTool = result.find((t) => t.name === 'my_edit_file')
      expect(editTool).toMatchObject({
        name: 'my_edit_file',
        originalName: 'edit_file',
        isInitialEnabled: true, // Filter contains 'my_edit_file'
      })

      const makeDirTool = result.find((t) => t.name === 'make_dir')
      expect(makeDirTool).toMatchObject({
        name: 'make_dir',
        isInitialEnabled: true,
      })

      // fetch_custom should appear but be disabled because it's not in the filter
      const fetchTool = result.find((t) => t.name === 'fetch_custom')
      expect(fetchTool).toMatchObject({
        name: 'fetch_custom',
        description: 'Custom fetch description',
        originalName: 'fetch',
        originalDescription: undefined, // Original description is no longer available when override is applied
        isInitialEnabled: false, // Filter doesn't contain 'fetch_custom'
      })
    })
  })
})
