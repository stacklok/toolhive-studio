import { describe, expect, it, vi, beforeEach } from 'vitest'

const {
  getChatSettingsMock,
  getSelectedModelMock,
  handleSaveSettingsMock,
  clearChatSettingsMock,
  saveSelectedModelMock,
} = vi.hoisted(() => ({
  getChatSettingsMock: vi.fn(),
  getSelectedModelMock: vi.fn(),
  handleSaveSettingsMock: vi.fn(),
  clearChatSettingsMock: vi.fn(),
  saveSelectedModelMock: vi.fn(),
}))

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(() => '/tmp'),
  },
}))

vi.mock('../../../settings-storage', () => ({
  getChatSettings: (...args: unknown[]) => getChatSettingsMock(...args),
  getSelectedModel: (...args: unknown[]) => getSelectedModelMock(...args),
  handleSaveSettings: (...args: unknown[]) => handleSaveSettingsMock(...args),
  clearChatSettings: (...args: unknown[]) => clearChatSettingsMock(...args),
  saveSelectedModel: (...args: unknown[]) => saveSelectedModelMock(...args),
}))

import {
  clearPlaygroundGatewaySettings,
  enablePlaygroundGateway,
  isPlaygroundGatewayEnabled,
  migratePlaygroundGatewayEnablement,
} from '../playground'

describe('playground gateway enablement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getChatSettingsMock.mockReturnValue({
      providerId: 'thv-llm',
      endpointURL: '',
      enabledTools: [],
    })
    getSelectedModelMock.mockReturnValue({ provider: '', model: '' })
  })

  it('is disabled when Playground has no stored endpoint', () => {
    expect(isPlaygroundGatewayEnabled()).toBe(false)
  })

  it('is enabled when Playground stored the opt-in marker', () => {
    getChatSettingsMock.mockReturnValue({
      providerId: 'thv-llm',
      endpointURL: 'enabled',
      enabledTools: [],
    })
    expect(isPlaygroundGatewayEnabled()).toBe(true)
  })

  it('migrates opt-in when the selected model is already the gateway', () => {
    getSelectedModelMock.mockReturnValue({
      provider: 'thv-llm',
      model: 'gpt-4.1',
    })

    migratePlaygroundGatewayEnablement()

    expect(handleSaveSettingsMock).toHaveBeenCalledWith('thv-llm', {
      endpointURL: 'enabled',
      enabledTools: [],
    })
  })

  it('does not migrate when another provider is selected', () => {
    getSelectedModelMock.mockReturnValue({
      provider: 'openai',
      model: 'gpt-4.1',
    })

    migratePlaygroundGatewayEnablement()

    expect(handleSaveSettingsMock).not.toHaveBeenCalled()
  })

  it('clears Playground settings and selected model on disable', () => {
    getSelectedModelMock.mockReturnValue({
      provider: 'thv-llm',
      model: 'gpt-4.1',
    })

    clearPlaygroundGatewaySettings()

    expect(clearChatSettingsMock).toHaveBeenCalledWith('thv-llm')
    expect(saveSelectedModelMock).toHaveBeenCalledWith('', '')
  })

  it('enablePlaygroundGateway writes the opt-in marker', () => {
    enablePlaygroundGateway()
    expect(handleSaveSettingsMock).toHaveBeenCalledWith('thv-llm', {
      endpointURL: 'enabled',
      enabledTools: [],
    })
  })
})
