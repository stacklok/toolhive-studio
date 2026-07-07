import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TokenUsage } from '../token-usage'
import type { ModelCost } from '../../../hooks/use-model-pricing'

const useModelPricingMock =
  vi.fn<
    (
      providerId: string | undefined,
      model: string | undefined
    ) => { pricing: ModelCost | undefined }
  >()

vi.mock('../../../hooks/use-model-pricing', () => ({
  useModelPricing: (
    providerId: string | undefined,
    model: string | undefined
  ) => useModelPricingMock(providerId, model),
}))

describe('TokenUsage', () => {
  beforeEach(() => {
    useModelPricingMock.mockReset()
    useModelPricingMock.mockReturnValue({ pricing: undefined })
  })

  it('renders inline cost when pricing is available', () => {
    useModelPricingMock.mockReturnValue({
      pricing: { input: 2.5, output: 10 },
    })
    render(
      <TokenUsage
        usage={{
          inputTokens: 1_000_000,
          outputTokens: 1_000_000,
          totalTokens: 2_000_000,
        }}
        providerId="openai"
        model="gpt-4o"
      />
    )
    // total cost = $2.5 + $10 = $12.50, rendered as "$12.50"
    expect(screen.getAllByText('$12.50').length).toBeGreaterThan(0)
  })

  it('does not render cost when pricing is missing', () => {
    useModelPricingMock.mockReturnValue({ pricing: undefined })
    const { container } = render(
      <TokenUsage
        usage={{ inputTokens: 100, outputTokens: 50, totalTokens: 150 }}
        providerId="ollama"
        model="llama3.1:8b"
      />
    )
    expect(container.textContent).not.toMatch(/\$/)
  })

  it('shows the cost breakdown section in the tooltip when pricing is available', async () => {
    useModelPricingMock.mockReturnValue({
      pricing: { input: 3, output: 15, cache_read: 0.3 },
    })
    render(
      <TokenUsage
        usage={{
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          cachedInputTokens: 400,
        }}
        providerId="anthropic"
        model="claude-sonnet-4-5"
      />
    )

    await userEvent.hover(screen.getByText('= 1500'))

    expect((await screen.findAllByText('Cost')).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Input cost:/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Cached cost:/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Output cost:/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Total cost:/).length).toBeGreaterThan(0)
    expect(
      screen.getAllByText('Pricing data from models.dev').length
    ).toBeGreaterThan(0)
  })

  it('shows reasoning and cached token counts from AI SDK v7 usage details', async () => {
    useModelPricingMock.mockReturnValue({
      pricing: { input: 3, output: 15, cache_read: 0.3 },
    })
    render(
      <TokenUsage
        usage={{
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          inputTokenDetails: {
            noCacheTokens: 600,
            cacheReadTokens: 400,
            cacheWriteTokens: undefined,
          },
          outputTokenDetails: {
            textTokens: 450,
            reasoningTokens: 50,
          },
        }}
        providerId="anthropic"
        model="claude-sonnet-4-5"
      />
    )

    await userEvent.hover(screen.getByText('= 1500'))

    expect(
      (await screen.findAllByText(/Reasoning tokens:/)).length
    ).toBeGreaterThan(0)
    expect(screen.getAllByText(/Cached input tokens:/).length).toBeGreaterThan(
      0
    )
  })

  it('shows reasoning and cached token counts from legacy v6 usage fields', async () => {
    useModelPricingMock.mockReturnValue({
      pricing: { input: 3, output: 15, cache_read: 0.3 },
    })
    render(
      <TokenUsage
        usage={{
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          cachedInputTokens: 400,
          reasoningTokens: 50,
        }}
        providerId="anthropic"
        model="claude-sonnet-4-5"
      />
    )

    await userEvent.hover(screen.getByText('= 1500'))

    expect(
      (await screen.findAllByText(/Reasoning tokens:/)).length
    ).toBeGreaterThan(0)
    expect(screen.getAllByText(/Cached input tokens:/).length).toBeGreaterThan(
      0
    )
  })

  it('keeps the existing token breakdown tooltip when pricing is missing', async () => {
    useModelPricingMock.mockReturnValue({ pricing: undefined })
    render(
      <TokenUsage
        usage={{ inputTokens: 100, outputTokens: 50, totalTokens: 150 }}
        providerId="openai"
        model="something-unknown"
      />
    )

    await userEvent.hover(screen.getByText('= 150'))

    expect(
      (await screen.findAllByText('Token Usage Breakdown')).length
    ).toBeGreaterThan(0)
    expect(screen.queryByText('Cost')).not.toBeInTheDocument()
    expect(
      screen.getAllByText(/Tokens are units of text that AI models process/)
        .length
    ).toBeGreaterThan(0)
  })
})
