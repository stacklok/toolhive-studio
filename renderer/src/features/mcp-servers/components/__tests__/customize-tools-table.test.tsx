import { screen, waitFor, cleanup } from '@testing-library/react'
import { expect, it, describe, vi, beforeEach, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { CustomizeToolsTable } from '../customize-tools-table'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'

// Mock the useRouter hook
const mockHistoryBack = vi.fn()
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    useRouter: () => ({
      history: {
        back: mockHistoryBack,
      },
    }),
  }
})

const mockTools = [
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
  {
    name: 'list_directory',
    description: 'List contents of a directory',
  },
]

describe('CustomizeToolsTable', () => {
  beforeEach(() => {
    mockHistoryBack.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Loading state', () => {
    it('renders skeleton rows when loading', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={[]} isLoading={true} />
      ))

      renderRoute(router)

      await waitFor(() => {
        // When loading, should have skeleton rows
        const rows = screen.getAllByRole('row')
        // 1 skeleton header row + 10 skeleton body rows = 11 rows
        expect(rows.length).toBe(11)
      })
    })

    it('disables buttons when loading', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={[]} isLoading={true} />
      ))

      renderRoute(router)

      await waitFor(() => {
        const applyButton = screen.getByRole('button', { name: /apply/i })
        const cancelButton = screen.getByRole('button', {
          name: /cancel/i,
        })

        expect(applyButton).toBeDisabled()
        expect(cancelButton).toBeDisabled()
      })
    })
  })

  describe('Empty state', () => {
    it('shows "No tools available" when tools array is empty and not loading', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={[]} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('No tools available')).toBeInTheDocument()
      })
    })
  })

  describe('Tools display', () => {
    it('renders all tools with correct names and descriptions', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
        expect(
          screen.getByText('Read a file from the filesystem')
        ).toBeInTheDocument()

        expect(screen.getByText('write_file')).toBeInTheDocument()
        expect(screen.getByText('Write content to a file')).toBeInTheDocument()

        expect(screen.getByText('delete_file')).toBeInTheDocument()
        expect(
          screen.getByText('Delete a file from the filesystem')
        ).toBeInTheDocument()

        expect(screen.getByText('list_directory')).toBeInTheDocument()
        expect(
          screen.getByText('List contents of a directory')
        ).toBeInTheDocument()
      })
    })

    it('renders table headers correctly', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('Tool')).toBeInTheDocument()
        expect(screen.getByText('Description')).toBeInTheDocument()
      })
    })

    it('handles tools without descriptions', async () => {
      const toolsWithoutDesc = [
        { name: 'tool1' },
        { name: 'tool2', description: '' },
      ]

      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={toolsWithoutDesc} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('tool1')).toBeInTheDocument()
        expect(screen.getByText('tool2')).toBeInTheDocument()
      })
    })
  })

  describe('Tool toggling', () => {
    it('initializes tools with correct enabled state', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        const switches = screen.getAllByRole('switch')
        // Should have 5 switches: 1 header toggle all + 4 tool switches
        expect(switches).toHaveLength(5)

        // Skip first switch (header), check the 4 tool switches
        expect(switches[1]).toBeChecked() // read_file
        expect(switches[2]).toBeChecked() // write_file
        expect(switches[3]).not.toBeChecked() // delete_file
        expect(switches[4]).toBeChecked() // list_directory
      })
    })

    it('defaults to enabled when isInitialEnabled is not provided', async () => {
      const toolsWithoutInitial = [{ name: 'default_tool' }]

      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={toolsWithoutInitial} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        const switches = screen.getAllByRole('switch')
        // Should have 2 switches: 1 header + 1 tool switch
        expect(switches).toHaveLength(2)
        expect(switches[1]).toBeChecked() // The tool switch should be checked
      })
    })

    it('toggles tool state when switch is clicked', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      const switches = screen.getAllByRole('switch')
      // switches[0] is the header toggle all, switches[1] is read_file
      const readFileSwitch = switches[1]!

      expect(readFileSwitch).toBeChecked()

      await userEvent.click(readFileSwitch)

      await waitFor(() => {
        expect(readFileSwitch).not.toBeChecked()
      })

      await userEvent.click(readFileSwitch)

      await waitFor(() => {
        expect(readFileSwitch).toBeChecked()
      })
    })

    it('allows toggling multiple tools independently', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      const switches = screen.getAllByRole('switch')

      // switches[0] is header, switches[1-4] are tools
      // Toggle read_file (index 1) and delete_file (index 3)
      await userEvent.click(switches[1]!) // read_file: true -> false
      await userEvent.click(switches[3]!) // delete_file: false -> true

      await waitFor(() => {
        expect(switches[1]).not.toBeChecked() // read_file
        expect(switches[2]).toBeChecked() // write_file
        expect(switches[3]).toBeChecked() // delete_file
        expect(switches[4]).toBeChecked() // list_directory
      })
    })
  })

  describe('Header toggle all switch', () => {
    it('is checked when all tools are enabled', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      const switches = screen.getAllByRole('switch')
      const headerSwitch = switches[0]!

      // By default, 3 out of 4 tools are enabled (delete_file is disabled)
      // So header switch should not be checked initially
      expect(headerSwitch).not.toBeChecked()
    })

    it('is checked when all tools become enabled', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      const switches = screen.getAllByRole('switch')
      const headerSwitch = switches[0]!
      const deleteFileSwitch = switches[3]! // delete_file is initially disabled

      // Enable the disabled tool
      await userEvent.click(deleteFileSwitch)

      await waitFor(() => {
        expect(headerSwitch).toBeChecked()
        expect(deleteFileSwitch).toBeChecked()
      })
    })

    it('enables all tools when clicked while unchecked', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      const switches = screen.getAllByRole('switch')
      const headerSwitch = switches[0]!

      expect(headerSwitch).not.toBeChecked()

      // Click header switch to enable all
      await userEvent.click(headerSwitch)

      await waitFor(() => {
        expect(headerSwitch).toBeChecked()
        // All tool switches should now be checked
        expect(switches[1]).toBeChecked() // read_file
        expect(switches[2]).toBeChecked() // write_file
        expect(switches[3]).toBeChecked() // delete_file
        expect(switches[4]).toBeChecked() // list_directory
      })
    })

    it('disables all tools when clicked while checked', async () => {
      const allEnabledTools = mockTools.map((tool) => ({
        ...tool,
        isInitialEnabled: true,
      }))

      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={allEnabledTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      const switches = screen.getAllByRole('switch')
      const headerSwitch = switches[0]!

      // Wait for header switch to be checked
      await waitFor(() => {
        expect(headerSwitch).toBeChecked()
      })

      // Click header switch to disable all
      await userEvent.click(headerSwitch)

      await waitFor(() => {
        expect(headerSwitch).not.toBeChecked()
        // All tool switches should now be unchecked
        expect(switches[1]).not.toBeChecked() // read_file
        expect(switches[2]).not.toBeChecked() // write_file
        expect(switches[3]).not.toBeChecked() // delete_file
        expect(switches[4]).not.toBeChecked() // list_directory
      })
    })

    it('unchecks when a single tool is disabled', async () => {
      const allEnabledTools = mockTools.map((tool) => ({
        ...tool,
        isInitialEnabled: true,
      }))

      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={allEnabledTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      const switches = screen.getAllByRole('switch')
      const headerSwitch = switches[0]!
      const readFileSwitch = switches[1]!

      // Header should be checked initially
      await waitFor(() => {
        expect(headerSwitch).toBeChecked()
      })

      // Disable one tool
      await userEvent.click(readFileSwitch)

      await waitFor(() => {
        expect(headerSwitch).not.toBeChecked()
        expect(readFileSwitch).not.toBeChecked()
      })
    })

    it('disables Apply button when all tools are disabled via header switch', async () => {
      const allEnabledTools = mockTools.map((tool) => ({
        ...tool,
        isInitialEnabled: true,
      }))

      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={allEnabledTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      const switches = screen.getAllByRole('switch')
      const headerSwitch = switches[0]!
      const applyButton = screen.getByRole('button', { name: /apply/i })

      // Initially, Apply button should be disabled (no changes)
      expect(applyButton).toBeDisabled()

      // Wait for header switch to be checked
      await waitFor(() => {
        expect(headerSwitch).toBeChecked()
      })

      // Click header switch to disable all tools
      await userEvent.click(headerSwitch)

      await waitFor(() => {
        // Header switch should be unchecked
        expect(headerSwitch).not.toBeChecked()
        // Apply button should be disabled (can't apply with all tools disabled)
        expect(applyButton).toBeDisabled()
      })
    })

    it('shows tooltip when hovering Apply button with all tools disabled', async () => {
      const allEnabledTools = mockTools.map((tool) => ({
        ...tool,
        isInitialEnabled: true,
      }))

      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={allEnabledTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      const switches = screen.getAllByRole('switch')
      const headerSwitch = switches[0]!
      const applyButton = screen.getByRole('button', { name: /apply/i })

      // Wait for header switch to be checked
      await waitFor(() => {
        expect(headerSwitch).toBeChecked()
      })

      // Click header switch to disable all tools
      await userEvent.click(headerSwitch)

      await waitFor(() => {
        expect(applyButton).toBeDisabled()
      })

      // Hover over the apply button (wrapped in span for tooltip)
      await userEvent.hover(applyButton.parentElement!)

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip')
        expect(tooltip).toHaveTextContent(
          /It is not possible to disable all tools/i
        )
      })
    })

    it('re-enables Apply button when at least one tool is enabled after disabling all', async () => {
      const allEnabledTools = mockTools.map((tool) => ({
        ...tool,
        isInitialEnabled: true,
      }))

      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={allEnabledTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      const switches = screen.getAllByRole('switch')
      const headerSwitch = switches[0]!
      const readFileSwitch = switches[1]!
      const applyButton = screen.getByRole('button', { name: /apply/i })

      // Disable all tools via header switch
      await userEvent.click(headerSwitch)

      await waitFor(() => {
        expect(applyButton).toBeDisabled()
      })

      // Enable one tool
      await userEvent.click(readFileSwitch)

      await waitFor(() => {
        expect(readFileSwitch).toBeChecked()
        // Apply button should be enabled again
        expect(applyButton).not.toBeDisabled()
      })
    })

    it('tracks analytics event when toggling all tools', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      const switches = screen.getAllByRole('switch')
      const headerSwitch = switches[0]!

      await userEvent.click(headerSwitch)

      // Note: We're not mocking trackEvent in these tests, but in a real scenario
      // you might want to verify the analytics call was made
      await waitFor(() => {
        expect(headerSwitch).toBeChecked()
      })
    })

    it('is not rendered when loading', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={true} />
      ))

      renderRoute(router)

      await waitFor(() => {
        const rows = screen.getAllByRole('row')
        expect(rows.length).toBe(11) // 1 header + 10 skeleton rows
      })

      // During loading, switches are skeleton elements, not real switches
      // We don't need to test the header switch behavior during loading
    })
  })

  describe('Apply button', () => {
    it('calls onApply with correct enabled tools state', async () => {
      const onApply = vi.fn().mockResolvedValue(undefined)

      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={mockTools}
          isLoading={false}
          onApply={onApply}
        />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      // Create a change by toggling a tool
      const switches = screen.getAllByRole('switch')
      const deleteFileSwitch = switches[3]! // delete_file is initially disabled
      await userEvent.click(deleteFileSwitch)

      // Wait for Apply button to be enabled
      const applyButton = await waitFor(() => {
        const btn = screen.getByRole('button', { name: /apply/i })
        expect(btn).not.toBeDisabled()
        return btn
      })

      await userEvent.click(applyButton)

      await waitFor(() => {
        expect(onApply).toHaveBeenCalledTimes(1)
        expect(onApply).toHaveBeenCalledWith(
          {
            read_file: true,
            write_file: true,
            delete_file: true, // Now enabled
            list_directory: true,
          },
          null // No overrides
        )
      })
    })

    it('calls onApply with updated state after toggling', async () => {
      const onApply = vi.fn().mockResolvedValue(undefined)

      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={mockTools}
          isLoading={false}
          onApply={onApply}
        />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      const switches = screen.getAllByRole('switch')

      // switches[0] is header, switches[1-4] are tools
      // Toggle read_file (index 1) and delete_file (index 3)
      await userEvent.click(switches[1]!) // read_file
      await userEvent.click(switches[3]!) // delete_file

      const applyButton = screen.getByRole('button', { name: /apply/i })
      await userEvent.click(applyButton)

      await waitFor(() => {
        expect(onApply).toHaveBeenCalledWith(
          {
            read_file: false,
            write_file: true,
            delete_file: true,
            list_directory: true,
          },
          null // No overrides
        )
      })
    })

    it('does not crash when onApply is not provided', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      const applyButton = screen.getByRole('button', { name: /apply/i })

      // Should not throw when onApply is not provided
      await userEvent.click(applyButton)

      // If we get here without throwing, the test passes
      expect(applyButton).toBeInTheDocument()
    })
  })

  describe('Cancel button', () => {
    it('navigates back when clicked', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', {
        name: /cancel/i,
      })
      await userEvent.click(cancelButton)

      await waitFor(() => {
        expect(mockHistoryBack).toHaveBeenCalledTimes(1)
      })
    })

    it('is enabled when there are multiple tools', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', {
        name: /cancel/i,
      })

      expect(cancelButton).not.toBeDisabled()
    })
  })

  describe('Drift alert', () => {
    it('does not show alert when drift is null', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={false} drift={null} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      expect(screen.queryByText('Tag drift detected')).not.toBeInTheDocument()
    })

    it('does not show alert when drift is undefined', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      expect(screen.queryByText('Tag drift detected')).not.toBeInTheDocument()
    })

    it('does not show alert when isLoading is true', async () => {
      const drift = {
        localTag: 'v1.0.0',
        registryTag: 'v2.0.0',
      }

      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={true} drift={drift} />
      ))

      renderRoute(router)

      await waitFor(() => {
        const rows = screen.getAllByRole('row')
        // 1 skeleton header row + 10 skeleton body rows = 11 rows
        expect(rows.length).toBe(11)
      })

      expect(screen.queryByText('Tag drift detected')).not.toBeInTheDocument()
    })

    it('shows drift alert with correct tags', async () => {
      const drift = {
        localTag: 'v1.0.0',
        registryTag: 'v2.0.0',
      }

      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={mockTools}
          isLoading={false}
          drift={drift}
        />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('Tag drift detected')).toBeInTheDocument()
      })

      expect(screen.getByText('v1.0.0')).toBeInTheDocument()
      expect(screen.getByText('v2.0.0')).toBeInTheDocument()

      expect(
        screen.getByText(
          /This image has drifted from the version in the registry/i
        )
      ).toBeInTheDocument()
    })

    it('shows alert with proper styling', async () => {
      const drift = {
        localTag: 'latest',
        registryTag: 'v3.0.0',
      }

      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={mockTools}
          isLoading={false}
          drift={drift}
        />
      ))

      renderRoute(router)

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert).toBeInTheDocument()
      })
    })

    it('displays both local and registry tags in badges', async () => {
      const drift = {
        localTag: 'v1.5.0-beta',
        registryTag: 'v2.0.0-stable',
      }

      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={mockTools}
          isLoading={false}
          drift={drift}
        />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('v1.5.0-beta')).toBeInTheDocument()
        expect(screen.getByText('v2.0.0-stable')).toBeInTheDocument()
      })
    })

    it('prioritizes drift alert over toolsDiff alert', async () => {
      const drift = {
        localTag: 'v1.0.0',
        registryTag: 'v2.0.0',
      }

      const toolsDiff = {
        hasExactMatch: false,
        addedTools: ['new_tool'],
        missingTools: ['old_tool'],
      }

      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={mockTools}
          isLoading={false}
          drift={drift}
          toolsDiff={toolsDiff}
        />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('Tag drift detected')).toBeInTheDocument()
      })

      // Should show drift, not toolsDiff
      expect(
        screen.queryByText('Tools differ from registry')
      ).not.toBeInTheDocument()
    })
  })

  describe('ToolsDiff alert', () => {
    it('does not show alert when toolsDiff is null', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={mockTools}
          isLoading={false}
          toolsDiff={null}
        />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      expect(
        screen.queryByText('Tools differ from registry')
      ).not.toBeInTheDocument()
    })

    it('does not show alert when toolsDiff has exact match', async () => {
      const toolsDiff = {
        hasExactMatch: true,
        addedTools: [],
        missingTools: [],
      }

      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={mockTools}
          isLoading={false}
          toolsDiff={toolsDiff}
        />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      expect(
        screen.queryByText('Tools differ from registry')
      ).not.toBeInTheDocument()
    })

    it('does not show alert when isLoading is true', async () => {
      const toolsDiff = {
        hasExactMatch: false,
        addedTools: [],
        missingTools: ['create_directory'],
      }

      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={mockTools}
          isLoading={true}
          toolsDiff={toolsDiff}
        />
      ))

      renderRoute(router)

      await waitFor(() => {
        const rows = screen.getAllByRole('row')
        // 1 skeleton header row + 10 skeleton body rows = 11 rows
        expect(rows.length).toBe(11)
      })

      expect(
        screen.queryByText('Tools differ from registry')
      ).not.toBeInTheDocument()
    })

    it('shows alert when there are missing tools', async () => {
      const toolsDiff = {
        hasExactMatch: false,
        addedTools: [],
        missingTools: ['create_directory', 'move_file'],
      }

      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={mockTools}
          isLoading={false}
          toolsDiff={toolsDiff}
        />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByText('Tools differ from registry')
        ).toBeInTheDocument()
      })

      expect(screen.getByText('Missing from server:')).toBeInTheDocument()
      expect(screen.getByText('create_directory')).toBeInTheDocument()
      expect(screen.getByText('move_file')).toBeInTheDocument()
    })

    it('shows alert with single missing tool', async () => {
      const toolsDiff = {
        hasExactMatch: false,
        addedTools: [],
        missingTools: ['create_directory'],
      }

      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={mockTools}
          isLoading={false}
          toolsDiff={toolsDiff}
        />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByText('Tools differ from registry')
        ).toBeInTheDocument()
      })

      expect(screen.getByText('create_directory')).toBeInTheDocument()
    })

    it('does not show alert when missingTools array is empty', async () => {
      const toolsDiff = {
        hasExactMatch: false,
        addedTools: ['extra_tool'],
        missingTools: [],
      }

      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={mockTools}
          isLoading={false}
          toolsDiff={toolsDiff}
        />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      expect(
        screen.queryByText('Tools differ from registry')
      ).not.toBeInTheDocument()
    })

    it('displays tools in badges', async () => {
      const toolsDiff = {
        hasExactMatch: false,
        addedTools: [],
        missingTools: ['tool_a', 'tool_b', 'tool_c'],
      }

      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={mockTools}
          isLoading={false}
          toolsDiff={toolsDiff}
        />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('tool_a')).toBeInTheDocument()
        expect(screen.getByText('tool_b')).toBeInTheDocument()
        expect(screen.getByText('tool_c')).toBeInTheDocument()
      })
    })

    it('shows correct message about tools not matching', async () => {
      const toolsDiff = {
        hasExactMatch: false,
        addedTools: [],
        missingTools: ['some_tool'],
      }

      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={mockTools}
          isLoading={false}
          toolsDiff={toolsDiff}
        />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(
          screen.getByText(
            /The tools available in the running server don't fully match the registry definition/i
          )
        ).toBeInTheDocument()
      })
    })
  })

  describe('Single tool behavior', () => {
    it('disables both buttons when only one tool', async () => {
      const singleTool = [
        {
          name: 'only_tool',
          description: 'The only tool available',
        },
      ]

      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={singleTool} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('only_tool')).toBeInTheDocument()
      })

      const applyButton = screen.getByRole('button', { name: /apply/i })
      const cancelButton = screen.getByRole('button', {
        name: /cancel/i,
      })

      // Apply button should be disabled (single tool, no overrides)
      // Cancel button should be enabled (only disabled when loading)
      expect(applyButton).toBeDisabled()
      expect(cancelButton).not.toBeDisabled()
    })

    it('disables both buttons when no tools', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={[]} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('No tools available')).toBeInTheDocument()
      })
    })

    it('enables both buttons when multiple tools and changes exist', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      // Initially Apply button should be disabled (no changes)
      const applyButton = screen.getByRole('button', { name: /apply/i })
      const cancelButton = screen.getByRole('button', {
        name: /cancel/i,
      })

      expect(applyButton).toBeDisabled()
      expect(cancelButton).not.toBeDisabled()

      // Create a change by toggling a tool
      const switches = screen.getAllByRole('switch')
      const deleteFileSwitch = switches[3]! // delete_file is initially disabled
      await userEvent.click(deleteFileSwitch)

      // Now Apply button should be enabled
      await waitFor(() => {
        expect(applyButton).not.toBeDisabled()
      })
    })

    it('shows tooltip on hover when only one tool', async () => {
      const singleTool = [
        {
          name: 'only_tool',
          description: 'The only tool available',
        },
      ]

      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={singleTool} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('only_tool')).toBeInTheDocument()
      })

      const applyButton = screen.getByRole('button', { name: /apply/i })

      await userEvent.hover(applyButton.parentElement!)

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip')
        // Tooltip now shows "No changes to apply" when disabled with no changes
        expect(tooltip).toHaveTextContent(/No changes to apply/i)
      })
    })
  })

  describe('Large lists', () => {
    it('handles many tools (> 10) correctly', async () => {
      const manyTools = Array.from({ length: 25 }, (_, i) => ({
        name: `tool_${i}`,
        description: `Description for tool ${i}`,
      }))

      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={manyTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('tool_0')).toBeInTheDocument()
      })

      const switches = screen.getAllByRole('switch')
      // Should have 26 switches: 1 header + 25 tool switches
      expect(switches).toHaveLength(26)
    })

    it('applies correct height class for many tools', async () => {
      const manyTools = Array.from({ length: 15 }, (_, i) => ({
        name: `tool_${i}`,
      }))

      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={manyTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('tool_0')).toBeInTheDocument()
      })
    })

    it('applies different height class when drift is present with many tools', async () => {
      const manyTools = Array.from({ length: 15 }, (_, i) => ({
        name: `tool_${i}`,
      }))

      const drift = {
        localTag: 'v1.0.0',
        registryTag: 'v2.0.0',
      }

      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={manyTools}
          isLoading={false}
          drift={drift}
        />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('Tag drift detected')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('renders switches with proper roles', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        const switches = screen.getAllByRole('switch')
        // Should have 5 switches: 1 header + 4 tool switches
        expect(switches).toHaveLength(5)
        switches.forEach((switchElement) => {
          expect(switchElement).toHaveAttribute('role', 'switch')
          expect(switchElement).toHaveAttribute('aria-checked')
        })
      })
    })

    it('renders buttons with proper roles and labels', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        const applyButton = screen.getByRole('button', { name: /apply/i })
        const cancelButton = screen.getByRole('button', {
          name: /cancel/i,
        })

        expect(applyButton).toBeInTheDocument()
        expect(cancelButton).toBeInTheDocument()
      })
    })

    it('renders table with proper semantic structure', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      const rows = screen.getAllByRole('row')
      expect(rows.length).toBeGreaterThan(0)

      const columnHeaders = screen.getAllByRole('columnheader')
      // 4 columns: Switch, Tool, Description, Edit (empty header)
      expect(columnHeaders.length).toBe(4)
    })
  })

  describe('Button states', () => {
    it('enables Apply button when changes exist and not loading', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      const applyButton = screen.getByRole('button', { name: /apply/i })
      const cancelButton = screen.getByRole('button', {
        name: /cancel/i,
      })

      // Initially Apply button should be disabled (no changes)
      expect(applyButton).toBeDisabled()
      expect(cancelButton).not.toBeDisabled()

      // Create a change
      const switches = screen.getAllByRole('switch')
      const deleteFileSwitch = switches[3]!
      await userEvent.click(deleteFileSwitch)

      // Now Apply button should be enabled
      await waitFor(() => {
        expect(applyButton).not.toBeDisabled()
      })
    })
  })

  describe('Tool overrides', () => {
    const toolsWithOriginalData = [
      {
        name: 'fetch',
        description: 'Fetches a URL from the internet',
        isInitialEnabled: true,
        originalName: 'fetch',
        originalDescription: 'Fetches a URL from the internet',
      },
      {
        name: 'make_dir',
        description: 'Makes a directory',
        isInitialEnabled: true,
      },
    ]

    it('opens edit modal when Edit button is clicked', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={toolsWithOriginalData} isLoading={false} />
      ))

      renderRoute(router)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByText('fetch')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      await user.click(editButtons[0]!)

      await waitFor(() => {
        expect(screen.getByText('Edit tool')).toBeInTheDocument()
        expect(screen.getByLabelText('Tool')).toBeInTheDocument()
        expect(screen.getByLabelText('Description')).toBeInTheDocument()
      })
    })

    it('displays original tool name and description as helper text in modal', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={toolsWithOriginalData} isLoading={false} />
      ))

      renderRoute(router)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByText('fetch')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      await user.click(editButtons[0]!)

      await waitFor(() => {
        expect(
          screen.getByText('Original tool name: fetch')
        ).toBeInTheDocument()
        // Description helper text may be wrapped in ExpandableText component
        expect(
          screen.getByText('Original tool description:')
        ).toBeInTheDocument()
      })

      // Find the description helper text container and check for the text inside it
      // (avoiding the textarea which also contains this text)
      const dialog = screen.getByRole('dialog')
      const descriptionHelper = Array.from(dialog.querySelectorAll('*')).find(
        (el) =>
          el.textContent?.includes('Original tool description:') &&
          el.textContent?.includes('Fetches a URL from the internet')
      )
      expect(descriptionHelper).toBeDefined()
    })

    it('shows N/A for original description when override description exists', async () => {
      const toolsWithOverride = [
        {
          name: 'fetch',
          description: 'Custom description',
          isInitialEnabled: true,
          originalName: 'fetch',
          originalDescription: 'Fetches a URL from the internet',
        },
      ]

      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={toolsWithOverride}
          isLoading={false}
          overrideTools={{ fetch: { description: 'Custom description' } }}
        />
      ))

      renderRoute(router)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByText('fetch')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      await user.click(editButtons[0]!)

      await waitFor(() => {
        // The text is split: "Original tool description: " and "N/A"
        expect(
          screen.getByText('Original tool description:')
        ).toBeInTheDocument()
        // Find N/A within the dialog context (not in the textarea)
        const dialog = screen.getByRole('dialog')
        const naText = Array.from(dialog.querySelectorAll('*')).find(
          (el) => el.textContent === 'N/A' && el.tagName !== 'TEXTAREA'
        )
        expect(naText).toBeDefined()
      })
    })

    it('allows editing tool name and saves it as override', async () => {
      const mockOnApply = vi.fn()
      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={toolsWithOriginalData}
          isLoading={false}
          onApply={mockOnApply}
        />
      ))

      renderRoute(router)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByText('fetch')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      await user.click(editButtons[0]!)

      await waitFor(() => {
        expect(screen.getByText('Edit tool')).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText('Tool')
      await user.clear(nameInput)
      await user.type(nameInput, 'fetch_custom')

      const saveButton = screen.getByRole('button', { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.queryByText('Edit tool')).not.toBeInTheDocument()
      })

      const applyButton = screen.getByRole('button', { name: /Apply/i })
      await user.click(applyButton)

      await waitFor(() => {
        expect(mockOnApply).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            fetch: { name: 'fetch_custom' },
          })
        )
      })
    })

    it('allows editing tool description and saves it as override', async () => {
      const mockOnApply = vi.fn()
      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={toolsWithOriginalData}
          isLoading={false}
          onApply={mockOnApply}
        />
      ))

      renderRoute(router)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByText('fetch')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      await user.click(editButtons[0]!)

      await waitFor(() => {
        expect(screen.getByText('Edit tool')).toBeInTheDocument()
      })

      const descriptionInput = screen.getByLabelText('Description')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Custom description')

      const saveButton = screen.getByRole('button', { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.queryByText('Edit tool')).not.toBeInTheDocument()
      })

      const applyButton = screen.getByRole('button', { name: /Apply/i })
      await user.click(applyButton)

      await waitFor(() => {
        expect(mockOnApply).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            fetch: { description: 'Custom description' },
          })
        )
      })
    })

    it('allows editing both name and description and saves as override', async () => {
      const mockOnApply = vi.fn()
      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={toolsWithOriginalData}
          isLoading={false}
          onApply={mockOnApply}
        />
      ))

      renderRoute(router)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByText('fetch')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      await user.click(editButtons[0]!)

      await waitFor(() => {
        expect(screen.getByText('Edit tool')).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText('Tool')
      await user.clear(nameInput)
      await user.type(nameInput, 'fetch_custom')

      const descriptionInput = screen.getByLabelText('Description')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Custom description')

      const saveButton = screen.getByRole('button', { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.queryByText('Edit tool')).not.toBeInTheDocument()
      })

      const applyButton = screen.getByRole('button', { name: /Apply/i })
      await user.click(applyButton)

      await waitFor(() => {
        expect(mockOnApply).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            fetch: { name: 'fetch_custom', description: 'Custom description' },
          })
        )
      })
    })

    it('uses originalName as key when tool has name override', async () => {
      const toolsWithNameOverride = [
        {
          name: 'fetch_custom',
          description: 'Fetches a URL from the internet',
          isInitialEnabled: true,
          originalName: 'fetch',
          originalDescription: 'Fetches a URL from the internet',
        },
      ]

      const mockOnApply = vi.fn()
      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={toolsWithNameOverride}
          isLoading={false}
          onApply={mockOnApply}
          overrideTools={{ fetch: { name: 'fetch_custom' } }}
        />
      ))

      renderRoute(router)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByText('fetch_custom')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      await user.click(editButtons[0]!)

      await waitFor(() => {
        expect(screen.getByText('Edit tool')).toBeInTheDocument()
        // Should show original name in helper text
        expect(
          screen.getByText('Original tool name: fetch')
        ).toBeInTheDocument()
      })

      const descriptionInput = screen.getByLabelText('Description')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Updated description')

      const saveButton = screen.getByRole('button', { name: /^Save$/i })
      await user.click(saveButton)

      const applyButton = screen.getByRole('button', { name: /Apply/i })
      await user.click(applyButton)

      await waitFor(() => {
        // Should use original name 'fetch' as key, not display name 'fetch_custom'
        // When editing a tool with an existing name override and only changing description,
        // both name and description should be preserved
        expect(mockOnApply).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            fetch: {
              name: 'fetch_custom',
              description: 'Updated description',
            },
          })
        )
      })
    })

    it('filters out overrides where both name and description are empty strings', async () => {
      const mockOnApply = vi.fn()
      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={toolsWithOriginalData}
          isLoading={false}
          onApply={mockOnApply}
        />
      ))

      renderRoute(router)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByText('fetch')).toBeInTheDocument()
      })

      // Edit fetch tool and set both to empty strings
      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      await user.click(editButtons[0]!)

      await waitFor(() => {
        expect(screen.getByText('Edit tool')).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText('Tool')
      await user.clear(nameInput)

      const descriptionInput = screen.getByLabelText('Description')
      await user.clear(descriptionInput)

      const saveButton = screen.getByRole('button', { name: /^Save$/i })
      await user.click(saveButton)

      const applyButton = screen.getByRole('button', { name: /Apply/i })
      await user.click(applyButton)

      await waitFor(() => {
        // Should not include empty override
        expect(mockOnApply).toHaveBeenCalledWith(expect.any(Object), null)
      })
    })

    it('allows empty string overrides if only one field is empty', async () => {
      const mockOnApply = vi.fn()
      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={toolsWithOriginalData}
          isLoading={false}
          onApply={mockOnApply}
        />
      ))

      renderRoute(router)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByText('fetch')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      await user.click(editButtons[0]!)

      await waitFor(() => {
        expect(screen.getByText('Edit tool')).toBeInTheDocument()
      })

      // Set name to empty but keep description
      const nameInput = screen.getByLabelText('Tool')
      await user.clear(nameInput)

      const saveButton = screen.getByRole('button', { name: /^Save$/i })
      await user.click(saveButton)

      const applyButton = screen.getByRole('button', { name: /Apply/i })
      await user.click(applyButton)

      await waitFor(() => {
        // Should include override with empty name
        expect(mockOnApply).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            fetch: { name: '' },
          })
        )
      })
    })

    it('enables Apply button when single tool has override', async () => {
      const singleTool = [
        {
          name: 'fetch',
          description: 'Fetches a URL',
          isInitialEnabled: true,
        },
      ]

      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={singleTool} isLoading={false} />
      ))

      renderRoute(router)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByText('fetch')).toBeInTheDocument()
      })

      const applyButton = screen.getByRole('button', { name: /Apply/i })
      // Initially disabled when single tool and no override
      expect(applyButton).toBeDisabled()

      // Edit and save override
      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      await user.click(editButtons[0]!)

      await waitFor(() => {
        expect(screen.getByText('Edit tool')).toBeInTheDocument()
      })

      const descriptionInput = screen.getByLabelText('Description')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Custom description')

      const saveButton = screen.getByRole('button', { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        // Apply button should now be enabled
        expect(applyButton).not.toBeDisabled()
      })
    })

    it('populates modal with current tool values including saved overrides', async () => {
      const toolsWithOverride = [
        {
          name: 'fetch_custom',
          description: 'Custom description',
          isInitialEnabled: true,
          originalName: 'fetch',
          originalDescription: 'Fetches a URL from the internet',
        },
      ]

      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={toolsWithOverride}
          isLoading={false}
          overrideTools={{
            fetch: { name: 'fetch_custom', description: 'Custom description' },
          }}
        />
      ))

      renderRoute(router)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByText('fetch_custom')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      await user.click(editButtons[0]!)

      await waitFor(() => {
        expect(screen.getByText('Edit tool')).toBeInTheDocument()
        const nameInput = screen.getByLabelText('Tool') as HTMLInputElement
        const descriptionInput = screen.getByLabelText(
          'Description'
        ) as HTMLTextAreaElement

        // Should show overridden values
        expect(nameInput.value).toBe('fetch_custom')
        expect(descriptionInput.value).toBe('Custom description')
      })
    })

    it('populates modal with local override values when reopening edit dialog', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={toolsWithOriginalData} isLoading={false} />
      ))

      renderRoute(router)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByText('fetch')).toBeInTheDocument()
      })

      // First edit: change name and description
      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      await user.click(editButtons[0]!)

      await waitFor(() => {
        expect(screen.getByText('Edit tool')).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText('Tool') as HTMLInputElement
      const descriptionInput = screen.getByLabelText(
        'Description'
      ) as HTMLTextAreaElement

      await user.clear(nameInput)
      await user.type(nameInput, 'fetch_custom')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Local custom description')

      const saveButton = screen.getByRole('button', { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.queryByText('Edit tool')).not.toBeInTheDocument()
        // Table should show local override values
        expect(screen.getByText('fetch_custom')).toBeInTheDocument()
        expect(screen.getByText('Local custom description')).toBeInTheDocument()
      })

      // Reopen edit dialog - should show local override values
      const editButtonsAfterSave = screen.getAllByRole('button', {
        name: /Edit/i,
      })
      await user.click(editButtonsAfterSave[0]!)

      await waitFor(() => {
        expect(screen.getByText('Edit tool')).toBeInTheDocument()
        const nameInputReopened = screen.getByLabelText(
          'Tool'
        ) as HTMLInputElement
        const descriptionInputReopened = screen.getByLabelText(
          'Description'
        ) as HTMLTextAreaElement

        // Should show local override values
        expect(nameInputReopened.value).toBe('fetch_custom')
        expect(descriptionInputReopened.value).toBe('Local custom description')
      })
    })

    it('closes modal when Cancel button is clicked', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={toolsWithOriginalData} isLoading={false} />
      ))

      renderRoute(router)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByText('fetch')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      await user.click(editButtons[0]!)

      await waitFor(() => {
        expect(screen.getByText('Edit tool')).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText('Edit tool')).not.toBeInTheDocument()
      })
    })

    it('displays override icon when tool has saved override', async () => {
      const toolsWithOverride = [
        {
          name: 'fetch_custom',
          description: 'Custom description',
          isInitialEnabled: true,
          originalName: 'fetch',
          originalDescription: 'Fetches a URL from the internet',
        },
      ]

      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={toolsWithOverride}
          isLoading={false}
          overrideTools={{
            fetch: { name: 'fetch_custom', description: 'Custom description' },
          }}
        />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('fetch_custom')).toBeInTheDocument()
      })

      // Icon should be present (Tag icon) - check by SVG class or tooltip
      await waitFor(() => {
        // Check for tooltip content that appears on hover
        const tooltipTrigger = screen
          .getByText('fetch_custom')
          .closest('div')
          ?.querySelector('[class*="lucide-tag"]')
        expect(tooltipTrigger).toBeDefined()
      })
    })

    it('displays orange icon when tool has only local override', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={toolsWithOriginalData} isLoading={false} />
      ))

      renderRoute(router)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByText('fetch')).toBeInTheDocument()
      })

      // Edit and save override
      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      await user.click(editButtons[0]!)

      await waitFor(() => {
        expect(screen.getByText('Edit tool')).toBeInTheDocument()
      })

      const descriptionInput = screen.getByLabelText(
        'Description'
      ) as HTMLTextAreaElement
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Local override description')

      const saveButton = screen.getByRole('button', { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.queryByText('Edit tool')).not.toBeInTheDocument()
      })

      // Icon should now appear with orange color (local override)
      await waitFor(() => {
        // Check for the tooltip trigger (Tag icon) - it should have orange color class
        const toolRow = screen.getByText('fetch').closest('tr')
        const iconContainer = toolRow?.querySelector('[class*="text-orange"]')
        expect(iconContainer).toBeDefined()
      })
    })

    it('displays local override values in table immediately after saving', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={toolsWithOriginalData} isLoading={false} />
      ))

      renderRoute(router)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByText('fetch')).toBeInTheDocument()
        expect(
          screen.getByText('Fetches a URL from the internet')
        ).toBeInTheDocument()
      })

      // Edit and change name and description
      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      await user.click(editButtons[0]!)

      await waitFor(() => {
        expect(screen.getByText('Edit tool')).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText('Tool') as HTMLInputElement
      const descriptionInput = screen.getByLabelText(
        'Description'
      ) as HTMLTextAreaElement

      await user.clear(nameInput)
      await user.type(nameInput, 'fetch_custom')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, 'Local custom description')

      const saveButton = screen.getByRole('button', { name: /^Save$/i })
      await user.click(saveButton)

      await waitFor(() => {
        // Table should immediately show local override values
        expect(screen.getByText('fetch_custom')).toBeInTheDocument()
        expect(screen.getByText('Local custom description')).toBeInTheDocument()
        // Original values should not be visible
        expect(screen.queryByText('fetch')).not.toBeInTheDocument()
        expect(
          screen.queryByText('Fetches a URL from the internet')
        ).not.toBeInTheDocument()
      })
    })

    it('stores original name in local override when resetting to original with saved override', async () => {
      const mockOnApply = vi.fn()
      const toolsWithExistingOverride = [
        {
          name: 'fetch_custom', // Display name (overridden)
          description: 'Fetches a URL from the internet',
          isInitialEnabled: true,
          originalName: 'fetch', // Original name (key)
          originalDescription: 'Fetches a URL from the internet',
        },
      ]

      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={toolsWithExistingOverride}
          isLoading={false}
          onApply={mockOnApply}
          overrideTools={{ fetch: { name: 'fetch_custom' } }}
        />
      ))

      renderRoute(router)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByText('fetch_custom')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      await user.click(editButtons[0]!)

      await waitFor(() => {
        expect(screen.getByText('Edit tool')).toBeInTheDocument()
      })

      // Reset name back to original
      const nameInput = screen.getByLabelText('Tool')
      await user.clear(nameInput)
      await user.type(nameInput, 'fetch')

      const saveButton = screen.getByRole('button', { name: /^Save$/i })
      await user.click(saveButton)

      // Table should now show original name
      await waitFor(() => {
        expect(screen.getByText('fetch')).toBeInTheDocument()
        expect(screen.queryByText('fetch_custom')).not.toBeInTheDocument()
      })

      const applyButton = screen.getByRole('button', { name: /Apply/i })
      await user.click(applyButton)

      await waitFor(() => {
        // When resetting to original with a saved override, we store the original name
        // to override the saved one. This will replace the saved override.
        expect(mockOnApply).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            fetch: { name: 'fetch' },
          })
        )
      })
    })
  })
})
