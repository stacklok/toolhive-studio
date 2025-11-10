import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCustomizeToolsTable } from '../use-customize-tools-table'
import type { Tool, ToolOverrides } from '../../types/tool-override'

// Mock analytics
vi.mock('@/common/lib/analytics', () => ({
  trackEvent: vi.fn(),
}))

describe('useCustomizeToolsTable', () => {
  const mockTools: Tool[] = [
    {
      name: 'read_file',
      description: 'Read a file from the filesystem',
      isInitialEnabled: true,
    },
    {
      name: 'write_file',
      description: 'Write content to a file',
      isInitialEnabled: true,
    },
    {
      name: 'delete_file',
      description: 'Delete a file from the filesystem',
      isInitialEnabled: false,
    },
  ]

  const mockToolsWithOverrides: Tool[] = [
    {
      name: 'fetch_custom',
      description: 'Custom description',
      isInitialEnabled: true,
      originalName: 'fetch',
      originalDescription: 'Original description',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('initializes enabledTools from tools prop', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
        })
      )

      expect(result.current.enabledTools).toEqual({
        read_file: true,
        write_file: true,
        delete_file: false,
      })
    })

    it('initializes toolsOverride from overrideTools prop', () => {
      const overrideTools: ToolOverrides = {
        fetch: { name: 'fetch_custom', description: 'Custom description' },
      }

      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
          overrideTools,
        })
      )

      expect(result.current.toolsOverride).toEqual(overrideTools)
    })

    it('initializes with empty state when no tools provided', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: [],
        })
      )

      expect(result.current.enabledTools).toEqual({})
      expect(result.current.toolsOverride).toEqual({})
      expect(result.current.editState.isOpen).toBe(false)
    })

    it('updates enabledTools when tools prop changes', () => {
      const { result, rerender } = renderHook(
        ({ tools }) =>
          useCustomizeToolsTable({
            tools,
          }),
        {
          initialProps: { tools: mockTools },
        }
      )

      expect(result.current.enabledTools).toEqual({
        read_file: true,
        write_file: true,
        delete_file: false,
      })

      const newTools: Tool[] = [
        {
          name: 'new_tool',
          description: 'New tool',
          isInitialEnabled: true,
        },
      ]

      rerender({ tools: newTools })

      expect(result.current.enabledTools).toEqual({
        new_tool: true,
      })
    })

    it('updates toolsOverride when overrideTools prop changes', () => {
      const overrideTools1: ToolOverrides = {
        fetch: { name: 'fetch_custom' },
      }

      const { result, rerender } = renderHook(
        ({ overrideTools }) =>
          useCustomizeToolsTable({
            tools: mockTools,
            overrideTools,
          }),
        {
          initialProps: { overrideTools: overrideTools1 },
        }
      )

      expect(result.current.toolsOverride).toEqual(overrideTools1)

      const overrideTools2: ToolOverrides = {
        fetch: { name: 'fetch_custom', description: 'Updated description' },
      }

      rerender({ overrideTools: overrideTools2 })

      expect(result.current.toolsOverride).toEqual(overrideTools2)
    })
  })

  describe('computed values', () => {
    it('returns true for isAllToolsEnabled when all tools are enabled', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
        })
      )

      act(() => {
        result.current.handleToolToggle('delete_file', true)
      })

      expect(result.current.isAllToolsEnabled).toBe(true)
    })

    it('returns false for isAllToolsEnabled when some tools are disabled', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
        })
      )

      expect(result.current.isAllToolsEnabled).toBe(false)
    })

    it('returns true for isAllToolsDisabled when all tools are disabled', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
        })
      )

      act(() => {
        result.current.handleToolToggle('read_file', false)
        result.current.handleToolToggle('write_file', false)
      })

      expect(result.current.isAllToolsDisabled).toBe(true)
    })

    it('returns false for isAllToolsDisabled when some tools are enabled', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
        })
      )

      expect(result.current.isAllToolsDisabled).toBe(false)
    })

    it('returns true for hasOverrideChanges when local overrides differ from saved', () => {
      const savedOverrides: ToolOverrides = {
        fetch: { name: 'fetch_custom' },
      }

      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
          overrideTools: savedOverrides,
        })
      )

      act(() => {
        result.current.handleEditTool({
          name: 'fetch_custom',
          description: 'Original description',
          originalName: 'fetch',
          originalDescription: 'Original description',
        })
      })

      act(() => {
        result.current.handleNameChange('fetch_updated')
      })

      act(() => {
        result.current.handleSaveToolOverride()
      })

      expect(result.current.hasOverrideChanges).toBe(true)
    })

    it('returns false for hasOverrideChanges when local overrides match saved', () => {
      const savedOverrides: ToolOverrides = {
        fetch: { name: 'fetch_custom' },
      }

      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
          overrideTools: savedOverrides,
        })
      )

      // Initialize with same overrides
      expect(result.current.hasOverrideChanges).toBe(false)
    })
  })

  describe('handleToolToggle', () => {
    it('toggles a single tool enabled state', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
        })
      )

      act(() => {
        result.current.handleToolToggle('read_file', false)
      })

      expect(result.current.enabledTools.read_file).toBe(false)
      expect(result.current.enabledTools.write_file).toBe(true)
    })

    it('enables a tool when toggled on', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
        })
      )

      act(() => {
        result.current.handleToolToggle('delete_file', true)
      })

      expect(result.current.enabledTools.delete_file).toBe(true)
    })

    it('disables a tool when toggled off', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
        })
      )

      act(() => {
        result.current.handleToolToggle('read_file', false)
      })

      expect(result.current.enabledTools.read_file).toBe(false)
    })
  })

  describe('handleAllToolsToggle', () => {
    it('enables all tools when toggled on', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
        })
      )

      act(() => {
        result.current.handleAllToolsToggle(true)
      })

      expect(result.current.enabledTools).toEqual({
        read_file: true,
        write_file: true,
        delete_file: true,
      })
    })

    it('disables all tools when toggled off', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
        })
      )

      act(() => {
        result.current.handleAllToolsToggle(false)
      })

      expect(result.current.enabledTools).toEqual({
        read_file: false,
        write_file: false,
        delete_file: false,
      })
    })
  })

  describe('handleEditTool', () => {
    it('opens edit modal with tool data', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
        })
      )

      const tool: Tool = {
        name: 'read_file',
        description: 'Read a file from the filesystem',
        originalName: 'read_file',
        originalDescription: 'Read a file from the filesystem',
      }

      act(() => {
        result.current.handleEditTool(tool)
      })

      expect(result.current.editState.isOpen).toBe(true)
      expect(result.current.editState.tool?.name).toBe('read_file')
      expect(result.current.editState.name).toBe('read_file')
      expect(result.current.editState.description).toBe(
        'Read a file from the filesystem'
      )
    })

    it('uses originalName as key when tool has name override', () => {
      const overrideTools: ToolOverrides = {
        fetch: { name: 'fetch_custom' },
      }

      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockToolsWithOverrides,
          overrideTools,
        })
      )

      const tool: Tool = {
        name: 'fetch_custom',
        description: 'Custom description',
        originalName: 'fetch',
        originalDescription: 'Original description',
      }

      act(() => {
        result.current.handleEditTool(tool)
      })

      expect(result.current.editState.tool?.name).toBe('fetch')
      expect(result.current.editState.name).toBe('fetch_custom')
    })

    it('populates description from tool when no local override', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
        })
      )

      const tool: Tool = {
        name: 'read_file',
        description: 'Read a file from the filesystem',
        originalName: 'read_file',
        originalDescription: 'Read a file from the filesystem',
      }

      act(() => {
        result.current.handleEditTool(tool)
      })

      expect(result.current.editState.description).toBe(
        'Read a file from the filesystem'
      )
    })

    it('sets hasOverrideDescription when override description exists', () => {
      const overrideTools: ToolOverrides = {
        fetch: { description: 'Custom description' },
      }

      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
          overrideTools,
        })
      )

      const tool: Tool = {
        name: 'fetch',
        description: 'Custom description',
        originalName: 'fetch',
        originalDescription: 'Original description',
      }

      act(() => {
        result.current.handleEditTool(tool)
      })

      expect(result.current.editState.hasOverrideDescription).toBe(true)
    })
  })

  describe('handleSaveToolOverride', () => {
    it('saves name override', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
        })
      )

      act(() => {
        result.current.handleEditTool({
          name: 'read_file',
          description: 'Read a file',
          originalName: 'read_file',
          originalDescription: 'Read a file',
        })
      })

      act(() => {
        result.current.handleNameChange('read_file_custom')
      })

      act(() => {
        result.current.handleSaveToolOverride()
      })

      expect(result.current.toolsOverride).toEqual({
        read_file: { name: 'read_file_custom' },
      })
    })

    it('saves description override', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
        })
      )

      act(() => {
        result.current.handleEditTool({
          name: 'read_file',
          description: 'Read a file',
          originalName: 'read_file',
          originalDescription: 'Read a file',
        })
      })

      act(() => {
        result.current.handleDescriptionChange('Custom description')
      })

      act(() => {
        result.current.handleSaveToolOverride()
      })

      expect(result.current.toolsOverride).toEqual({
        read_file: { description: 'Custom description' },
      })
    })

    it('saves both name and description overrides', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
        })
      )

      act(() => {
        result.current.handleEditTool({
          name: 'read_file',
          description: 'Read a file',
          originalName: 'read_file',
          originalDescription: 'Read a file',
        })
      })

      act(() => {
        result.current.handleNameChange('read_file_custom')
        result.current.handleDescriptionChange('Custom description')
      })

      act(() => {
        result.current.handleSaveToolOverride()
      })

      expect(result.current.toolsOverride).toEqual({
        read_file: {
          name: 'read_file_custom',
          description: 'Custom description',
        },
      })
    })

    it('stores original name in local override when resetting to original with saved override', () => {
      const overrideTools: ToolOverrides = {
        read_file: { name: 'read_file_custom' },
      }

      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
          overrideTools,
        })
      )

      act(() => {
        result.current.handleEditTool({
          name: 'read_file_custom',
          description: 'Read a file',
          originalName: 'read_file',
          originalDescription: 'Read a file',
        })
      })

      act(() => {
        result.current.handleNameChange('read_file')
      })

      act(() => {
        result.current.handleSaveToolOverride()
      })

      // When resetting to original with a saved override, we store the original name
      // to override the saved one. This will replace the saved override when applied.
      expect(result.current.toolsOverride).toEqual({
        read_file: { name: 'read_file' },
      })
    })

    it('closes modal after saving', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
        })
      )

      act(() => {
        result.current.handleEditTool({
          name: 'read_file',
          description: 'Read a file',
          originalName: 'read_file',
          originalDescription: 'Read a file',
        })
      })

      act(() => {
        result.current.handleNameChange('read_file_custom')
      })

      act(() => {
        result.current.handleSaveToolOverride()
      })

      expect(result.current.editState.isOpen).toBe(false)
      expect(result.current.editState.tool).toBe(null)
    })

    it('does nothing when no tool is selected', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
        })
      )

      const initialOverride = { ...result.current.toolsOverride }

      act(() => {
        result.current.handleSaveToolOverride()
      })

      expect(result.current.toolsOverride).toEqual(initialOverride)
    })

    it('uses originalName as key when tool has name override', () => {
      const overrideTools: ToolOverrides = {
        fetch: { name: 'fetch_custom' },
      }

      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
          overrideTools,
        })
      )

      act(() => {
        result.current.handleEditTool({
          name: 'fetch_custom',
          description: 'Custom description',
          originalName: 'fetch',
          originalDescription: 'Original description',
        })
      })

      act(() => {
        result.current.handleDescriptionChange('Updated description')
      })

      act(() => {
        result.current.handleSaveToolOverride()
      })

      // When editing a tool with an existing name override and only changing description,
      // both name and description should be preserved (name from existing override, description from new change)
      expect(result.current.toolsOverride).toEqual({
        fetch: {
          name: 'fetch_custom',
          description: 'Updated description',
        },
      })
    })
  })

  describe('handleCloseEditModal', () => {
    it('closes modal and resets edit state', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
        })
      )

      act(() => {
        result.current.handleEditTool({
          name: 'read_file',
          description: 'Read a file',
          originalName: 'read_file',
          originalDescription: 'Read a file',
        })
        result.current.handleNameChange('read_file_custom')
      })

      expect(result.current.editState.isOpen).toBe(true)

      act(() => {
        result.current.handleCloseEditModal()
      })

      expect(result.current.editState.isOpen).toBe(false)
      expect(result.current.editState.tool).toBe(null)
      expect(result.current.editState.name).toBe('')
      expect(result.current.editState.description).toBe('')
      expect(result.current.editState.hasOverrideDescription).toBe(false)
    })
  })

  describe('handleNameChange', () => {
    it('updates name in edit state', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
        })
      )

      act(() => {
        result.current.handleEditTool({
          name: 'read_file',
          description: 'Read a file',
          originalName: 'read_file',
          originalDescription: 'Read a file',
        })
        result.current.handleNameChange('new_name')
      })

      expect(result.current.editState.name).toBe('new_name')
    })
  })

  describe('handleDescriptionChange', () => {
    it('updates description in edit state', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
        })
      )

      act(() => {
        result.current.handleEditTool({
          name: 'read_file',
          description: 'Read a file',
          originalName: 'read_file',
          originalDescription: 'Read a file',
        })
        result.current.handleDescriptionChange('New description')
      })

      expect(result.current.editState.description).toBe('New description')
    })
  })

  describe('handleApply', () => {
    it('calls onApply with enabledTools and filtered overrides', async () => {
      const mockOnApply = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
          onApply: mockOnApply,
        })
      )

      act(() => {
        result.current.handleEditTool({
          name: 'read_file',
          description: 'Read a file',
          originalName: 'read_file',
          originalDescription: 'Read a file',
        })
      })

      act(() => {
        result.current.handleNameChange('read_file_custom')
      })

      act(() => {
        result.current.handleSaveToolOverride()
      })

      act(() => {
        result.current.handleApply()
      })

      await waitFor(() => {
        expect(mockOnApply).toHaveBeenCalledWith(result.current.enabledTools, {
          read_file: { name: 'read_file_custom' },
        })
      })
    })

    it('filters out empty overrides before calling onApply', async () => {
      const mockOnApply = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
          onApply: mockOnApply,
        })
      )

      act(() => {
        result.current.handleEditTool({
          name: 'read_file',
          description: 'Read a file',
          originalName: 'read_file',
          originalDescription: 'Read a file',
        })
        result.current.handleNameChange('')
        result.current.handleDescriptionChange('')
        result.current.handleSaveToolOverride()
        result.current.handleApply()
      })

      await waitFor(() => {
        expect(mockOnApply).toHaveBeenCalledWith(
          result.current.enabledTools,
          null
        )
      })
    })

    it('calls onApply with null when no overrides exist', async () => {
      const mockOnApply = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
          onApply: mockOnApply,
        })
      )

      act(() => {
        result.current.handleApply()
      })

      await waitFor(() => {
        expect(mockOnApply).toHaveBeenCalledWith(
          result.current.enabledTools,
          null
        )
      })
    })

    it('does not call onApply when not provided', () => {
      const { result } = renderHook(() =>
        useCustomizeToolsTable({
          tools: mockTools,
        })
      )

      expect(() => {
        act(() => {
          result.current.handleApply()
        })
      }).not.toThrow()
    })
  })
})
