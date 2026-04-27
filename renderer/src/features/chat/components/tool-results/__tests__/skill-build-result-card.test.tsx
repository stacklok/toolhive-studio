import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SkillBuildResultCard } from '../skill-build-result-card'
import type { SkillBuildResult } from '../../../lib/parse-skill-build-result'

const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('@/common/lib/analytics', () => ({
  trackEvent: vi.fn(),
}))

const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

const dialogInstallSkillProps = vi.fn()
vi.mock('@/features/skills/components/dialog-install-skill', () => ({
  DialogInstallSkill: (props: Record<string, unknown>) => {
    dialogInstallSkillProps(props)
    return props.open ? (
      <div data-testid="install-dialog">
        <span data-testid="install-default-reference">
          {String(props.defaultReference)}
        </span>
        <span data-testid="install-default-version">
          {String(props.defaultVersion)}
        </span>
      </div>
    ) : null
  },
}))

const writeText = vi.fn()
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText },
  writable: true,
})

const fullResult: SkillBuildResult = {
  reference: 'ghcr.io/example/my-skill:v0.0.4',
  apiReference: 'ghcr.io/example/my-skill:v0.0.4',
  build: {
    name: 'my-skill',
    description: 'A handy skill',
    tag: 'ghcr.io/example/my-skill:v0.0.4',
    version: 'v0.0.4',
    digest: 'sha256:deadbeefcafe1234',
  },
}

describe('SkillBuildResultCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    writeText.mockResolvedValue(undefined)
  })

  it('renders the skill name, description, version, tag and shortened digest', () => {
    render(<SkillBuildResultCard result={fullResult} />)

    expect(screen.getByText('Skill built')).toBeInTheDocument()
    expect(screen.getByText('my-skill')).toBeInTheDocument()
    expect(screen.getByText('A handy skill')).toBeInTheDocument()
    expect(screen.getByText('v0.0.4')).toBeInTheDocument()
    expect(
      screen.getByText('ghcr.io/example/my-skill:v0.0.4')
    ).toBeInTheDocument()
    expect(screen.getByText(/sha256:deadbeefcafe…/)).toBeInTheDocument()
  })

  it('opens the install dialog with the bare name and version prefilled', async () => {
    render(<SkillBuildResultCard result={fullResult} />)

    await userEvent.click(screen.getByTestId('chat-build-install'))

    expect(screen.getByTestId('install-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('install-default-reference')).toHaveTextContent(
      'my-skill'
    )
    expect(screen.getByTestId('install-default-version')).toHaveTextContent(
      'v0.0.4'
    )
  })

  it('navigates to the build detail page using apiReference when "View details" is clicked', async () => {
    render(<SkillBuildResultCard result={fullResult} />)

    await userEvent.click(screen.getByTestId('chat-build-view-details'))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/skills/builds/$tag',
      params: { tag: 'ghcr.io/example/my-skill:v0.0.4' },
    })
  })

  it('hides the "View details" button when no navigable tag is available', () => {
    const result: SkillBuildResult = {
      reference: 'my-skill',
      build: { name: 'my-skill', tag: 'v0.0.4' },
    }

    render(<SkillBuildResultCard result={result} />)

    expect(
      screen.queryByTestId('chat-build-view-details')
    ).not.toBeInTheDocument()
  })

  it('falls back to a registry-prefixed build.tag when apiReference is missing', async () => {
    const result: SkillBuildResult = {
      reference: 'my-skill',
      build: {
        name: 'my-skill',
        tag: 'ghcr.io/example/my-skill:latest',
      },
    }

    render(<SkillBuildResultCard result={result} />)

    await userEvent.click(screen.getByTestId('chat-build-view-details'))
    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/skills/builds/$tag',
      params: { tag: 'ghcr.io/example/my-skill:latest' },
    })
  })

  it('copies just the bare skill name to the clipboard', async () => {
    render(<SkillBuildResultCard result={fullResult} />)

    await userEvent.click(screen.getByTestId('chat-build-copy-reference'))

    expect(writeText).toHaveBeenCalledWith('my-skill')
    expect(mockToastSuccess).toHaveBeenCalledWith(
      'Copied skill name to clipboard'
    )
  })

  it('passes an empty version to the install dialog when no explicit version exists', async () => {
    const result: SkillBuildResult = {
      reference: 'my-skill',
      apiReference: 'ghcr.io/example/my-skill:latest',
      build: {
        name: 'my-skill',
        tag: 'ghcr.io/example/my-skill:latest',
      },
    }

    render(<SkillBuildResultCard result={result} />)
    await userEvent.click(screen.getByTestId('chat-build-install'))

    expect(screen.getByTestId('install-default-version')).toHaveTextContent('')
    expect(screen.getByTestId('install-default-reference')).toHaveTextContent(
      'my-skill'
    )
  })

  it('shows an error toast when copying to the clipboard fails', async () => {
    writeText.mockRejectedValueOnce(new Error('nope'))

    render(<SkillBuildResultCard result={fullResult} />)
    await userEvent.click(screen.getByTestId('chat-build-copy-reference'))

    expect(mockToastError).toHaveBeenCalledWith('Failed to copy skill name')
  })
})
