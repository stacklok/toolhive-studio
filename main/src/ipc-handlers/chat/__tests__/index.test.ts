import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  registerMcpTools: vi.fn(),
  registerMcpApps: vi.fn(),
  registerProviders: vi.fn(),
  registerSettings: vi.fn(),
  registerStreaming: vi.fn(),
  registerThreads: vi.fn(),
  registerAgents: vi.fn(),
}))

vi.mock('../mcp-tools', () => ({ register: mocks.registerMcpTools }))
vi.mock('../mcp-apps', () => ({ register: mocks.registerMcpApps }))
vi.mock('../providers', () => ({ register: mocks.registerProviders }))
vi.mock('../settings', () => ({ register: mocks.registerSettings }))
vi.mock('../streaming', () => ({ register: mocks.registerStreaming }))
vi.mock('../threads', () => ({ register: mocks.registerThreads }))
vi.mock('../agents', () => ({ register: mocks.registerAgents }))

import { register } from '../index'

describe('chat register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls every chat handler registration function exactly once', () => {
    register()

    expect(mocks.registerProviders).toHaveBeenCalledOnce()
    expect(mocks.registerStreaming).toHaveBeenCalledOnce()
    expect(mocks.registerSettings).toHaveBeenCalledOnce()
    expect(mocks.registerMcpTools).toHaveBeenCalledOnce()
    expect(mocks.registerMcpApps).toHaveBeenCalledOnce()
    expect(mocks.registerThreads).toHaveBeenCalledOnce()
    expect(mocks.registerAgents).toHaveBeenCalledOnce()
  })
})
