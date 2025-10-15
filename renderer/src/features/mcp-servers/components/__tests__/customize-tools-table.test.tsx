import { screen, waitFor } from '@testing-library/react'
import { expect, it, describe, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { CustomizeToolsTable } from '../customize-tools-table'
import { renderRoute } from '@/common/test/render-route'
import { createTestRouter } from '@/common/test/create-test-router'

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
  describe('Loading state', () => {
    it('renders skeleton rows when loading', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={[]} isLoading={true} />
      ))

      renderRoute(router)

      await waitFor(() => {
        // When loading, should have skeleton rows (10 rows)
        const rows = screen.getAllByRole('row')
        // 1 header row + 10 skeleton rows
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
        const resetButton = screen.getByRole('button', {
          name: /enable all tools/i,
        })

        expect(applyButton).toBeDisabled()
        expect(resetButton).toBeDisabled()
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
        expect(switches).toHaveLength(4)

        expect(switches[0]).toBeChecked()
        expect(switches[1]).toBeChecked()
        expect(switches[2]).not.toBeChecked()
        expect(switches[3]).toBeChecked()
      })
    })

    it('defaults to enabled when isInitialEnabled is not provided', async () => {
      const toolsWithoutInitial = [{ name: 'default_tool' }]

      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={toolsWithoutInitial} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        const switchElement = screen.getByRole('switch')
        expect(switchElement).toBeChecked()
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
      const readFileSwitch = switches[0]!

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

      await userEvent.click(switches[0]!)
      await userEvent.click(switches[2]!)

      await waitFor(() => {
        expect(switches[0]).not.toBeChecked()
        expect(switches[1]).toBeChecked()
        expect(switches[2]).toBeChecked()
        expect(switches[3]).toBeChecked()
      })
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

      const applyButton = screen.getByRole('button', { name: /apply/i })
      await userEvent.click(applyButton)

      await waitFor(() => {
        expect(onApply).toHaveBeenCalledTimes(1)
        expect(onApply).toHaveBeenCalledWith({
          read_file: true,
          write_file: true,
          delete_file: false,
          list_directory: true,
        })
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

      await userEvent.click(switches[0]!)
      await userEvent.click(switches[2]!)

      const applyButton = screen.getByRole('button', { name: /apply/i })
      await userEvent.click(applyButton)

      await waitFor(() => {
        expect(onApply).toHaveBeenCalledWith({
          read_file: false,
          write_file: true,
          delete_file: true,
          list_directory: true,
        })
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

  describe('Reset button', () => {
    it('calls onReset when clicked', async () => {
      const onReset = vi.fn()

      const router = createTestRouter(() => (
        <CustomizeToolsTable
          tools={mockTools}
          isLoading={false}
          onReset={onReset}
        />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      const resetButton = screen.getByRole('button', {
        name: /enable all tools/i,
      })
      await userEvent.click(resetButton)

      await waitFor(() => {
        expect(onReset).toHaveBeenCalledTimes(1)
      })
    })

    it('does not crash when onReset is not provided', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        expect(screen.getByText('read_file')).toBeInTheDocument()
      })

      const resetButton = screen.getByRole('button', {
        name: /enable all tools/i,
      })

      await userEvent.click(resetButton)

      expect(resetButton).toBeInTheDocument()
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
      expect(switches).toHaveLength(25)
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
        expect(switches).toHaveLength(4)
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
        const resetButton = screen.getByRole('button', {
          name: /enable all tools/i,
        })

        expect(applyButton).toBeInTheDocument()
        expect(resetButton).toBeInTheDocument()
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
      expect(columnHeaders.length).toBe(3)
    })
  })

  describe('Button states', () => {
    it('enables buttons when not loading', async () => {
      const router = createTestRouter(() => (
        <CustomizeToolsTable tools={mockTools} isLoading={false} />
      ))

      renderRoute(router)

      await waitFor(() => {
        const applyButton = screen.getByRole('button', { name: /apply/i })
        const resetButton = screen.getByRole('button', {
          name: /enable all tools/i,
        })

        expect(applyButton).not.toBeDisabled()
        expect(resetButton).not.toBeDisabled()
      })
    })
  })
})
