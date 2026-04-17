import { render, screen, waitFor } from '@testing-library/react'
import { expect, it, describe, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { HttpResponse } from 'msw'
import { SkillMarkdown } from '../skill-markdown'
import { mockedGetApiV1BetaSkillsContent } from '@mocks/fixtures/skills_content/get'

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  )
}

const OCI_REF = 'ghcr.io/org/my-skill:v1'

beforeEach(() => {
  mockedGetApiV1BetaSkillsContent.reset()
})

describe('SkillMarkdown', () => {
  it('renders markdown body on successful fetch', async () => {
    renderWithProviders(<SkillMarkdown ociRef={OCI_REF} />)

    await waitFor(() => {
      expect(screen.getByText('My Skill')).toBeInTheDocument()
    })
  })

  it('renders a section from the markdown body', async () => {
    renderWithProviders(<SkillMarkdown ociRef={OCI_REF} />)

    await waitFor(() => {
      expect(screen.getByText('Usage')).toBeInTheDocument()
    })
  })

  it('shows a skeleton while loading', () => {
    renderWithProviders(<SkillMarkdown ociRef={OCI_REF} />)

    // Skeletons render before data resolves
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows a 404 error message when skill content is not found', async () => {
    mockedGetApiV1BetaSkillsContent.overrideHandler(() =>
      HttpResponse.json({ message: 'Not found' }, { status: 404 })
    )

    renderWithProviders(<SkillMarkdown ociRef={OCI_REF} />)

    await waitFor(() => {
      expect(
        screen.getByText('SKILL.md not found for this skill.')
      ).toBeInTheDocument()
    })
  })

  it('shows a 503 error message when registry is unavailable', async () => {
    mockedGetApiV1BetaSkillsContent.overrideHandler(() =>
      HttpResponse.json({ message: 'Service unavailable' }, { status: 503 })
    )

    renderWithProviders(<SkillMarkdown ociRef={OCI_REF} />)

    await waitFor(() => {
      expect(
        screen.getByText('Registry is currently unavailable. Try again later.')
      ).toBeInTheDocument()
    })
  })

  it('shows a generic error message for other errors', async () => {
    mockedGetApiV1BetaSkillsContent.overrideHandler(() =>
      HttpResponse.json({ message: 'Internal server error' }, { status: 500 })
    )

    renderWithProviders(<SkillMarkdown ociRef={OCI_REF} />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load SKILL.md.')).toBeInTheDocument()
    })
  })

  it('strips YAML frontmatter when stripFrontmatter is true', async () => {
    mockedGetApiV1BetaSkillsContent.override((data) => ({
      ...data,
      body: '---\nname: my-skill\ndescription: A helpful skill\n---\n\n# My Skill\n\nBody content.',
    }))

    renderWithProviders(<SkillMarkdown ociRef={OCI_REF} stripFrontmatter />)

    await waitFor(() => {
      expect(screen.getByText('My Skill')).toBeInTheDocument()
    })
    expect(screen.queryByText(/name: my-skill/)).not.toBeInTheDocument()
    expect(
      screen.queryByText(/description: A helpful skill/)
    ).not.toBeInTheDocument()
  })

  it('keeps frontmatter when stripFrontmatter is not set', async () => {
    mockedGetApiV1BetaSkillsContent.override((data) => ({
      ...data,
      body: '---\nname: my-skill\n---\n\n# Heading',
    }))

    renderWithProviders(<SkillMarkdown ociRef={OCI_REF} />)

    await waitFor(() => {
      expect(screen.getByText(/name: my-skill/)).toBeInTheDocument()
    })
  })

  it('shows empty state when body is absent from response', async () => {
    mockedGetApiV1BetaSkillsContent.override((data) => ({
      ...data,
      body: undefined,
    }))

    renderWithProviders(<SkillMarkdown ociRef={OCI_REF} />)

    await waitFor(() => {
      expect(
        screen.getByText('No SKILL.md content available.')
      ).toBeInTheDocument()
    })
  })
})
