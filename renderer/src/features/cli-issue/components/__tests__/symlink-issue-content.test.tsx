import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SymlinkIssueContent } from '../symlink-issue-content'

describe('SymlinkIssueContent', () => {
  const defaultProps = {
    type: 'broken' as const,
    target: '/old/path/to/thv',
    onRepair: vi.fn(),
    isLoading: false,
  }

  describe('broken symlink', () => {
    it('renders the broken symlink title', () => {
      render(<SymlinkIssueContent {...defaultProps} type="broken" />)

      expect(screen.getByText('CLI Installation Needs Repair')).toBeVisible()
    })

    it('renders the broken symlink description', () => {
      render(<SymlinkIssueContent {...defaultProps} type="broken" />)

      expect(
        screen.getByText('The ToolHive CLI symlink is broken.')
      ).toBeVisible()
    })

    it('displays "Was pointing to:" label', () => {
      render(<SymlinkIssueContent {...defaultProps} type="broken" />)

      expect(screen.getByText('Was pointing to:')).toBeVisible()
    })

    it('displays the target path', () => {
      render(<SymlinkIssueContent {...defaultProps} type="broken" />)

      expect(screen.getByText('/old/path/to/thv')).toBeVisible()
    })

    it('displays the detail message for broken symlink', () => {
      render(<SymlinkIssueContent {...defaultProps} type="broken" />)

      expect(
        screen.getByText(/This can happen if ToolHive Studio was moved/)
      ).toBeVisible()
    })

    it('shows "Repair" button text', () => {
      render(<SymlinkIssueContent {...defaultProps} type="broken" />)

      expect(screen.getByRole('button', { name: /repair/i })).toBeVisible()
    })
  })

  describe('tampered symlink', () => {
    it('renders the tampered symlink title', () => {
      render(<SymlinkIssueContent {...defaultProps} type="tampered" />)

      expect(screen.getByText('CLI Installation Modified')).toBeVisible()
    })

    it('renders the tampered symlink description', () => {
      render(<SymlinkIssueContent {...defaultProps} type="tampered" />)

      expect(
        screen.getByText('The ToolHive CLI has been modified externally.')
      ).toBeVisible()
    })

    it('displays "Currently pointing to:" label', () => {
      render(<SymlinkIssueContent {...defaultProps} type="tampered" />)

      expect(screen.getByText('Currently pointing to:')).toBeVisible()
    })

    it('displays the detail message for tampered symlink', () => {
      render(<SymlinkIssueContent {...defaultProps} type="tampered" />)

      expect(
        screen.getByText(/This could cause version compatibility issues/)
      ).toBeVisible()
    })

    it('shows "Restore" button text', () => {
      render(<SymlinkIssueContent {...defaultProps} type="tampered" />)

      expect(screen.getByRole('button', { name: /restore/i })).toBeVisible()
    })
  })

  describe('interactions', () => {
    it('calls onRepair when button is clicked', async () => {
      const onRepair = vi.fn()
      const user = userEvent.setup()

      render(<SymlinkIssueContent {...defaultProps} onRepair={onRepair} />)

      const button = screen.getByRole('button', { name: /repair/i })
      await user.click(button)

      expect(onRepair).toHaveBeenCalledTimes(1)
    })

    it('disables button when loading', () => {
      render(<SymlinkIssueContent {...defaultProps} isLoading={true} />)

      const button = screen.getByRole('button', { name: /repair/i })
      expect(button).toBeDisabled()
    })

    it('calls onRepair for Restore button', async () => {
      const onRepair = vi.fn()
      const user = userEvent.setup()

      render(
        <SymlinkIssueContent
          {...defaultProps}
          type="tampered"
          onRepair={onRepair}
        />
      )

      const button = screen.getByRole('button', { name: /restore/i })
      await user.click(button)

      expect(onRepair).toHaveBeenCalledTimes(1)
    })
  })
})
