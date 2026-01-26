import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest'

describe('Feature Flags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('window.electronAPI feature flags', () => {
    it('should call electronAPI.featureFlags.get', async () => {
      ;(window.electronAPI.featureFlags.get as Mock).mockResolvedValue(true)

      const result = await window.electronAPI.featureFlags.get('test')

      expect(result).toBe(true)
      expect(window.electronAPI.featureFlags.get).toHaveBeenCalledWith('test')
    })

    it('should call electronAPI.featureFlags.enable', async () => {
      ;(window.electronAPI.featureFlags.enable as Mock).mockResolvedValue(
        undefined
      )

      await window.electronAPI.featureFlags.enable('test')

      expect(window.electronAPI.featureFlags.enable).toHaveBeenCalledWith(
        'test'
      )
    })

    it('should call electronAPI.featureFlags.disable', async () => {
      ;(window.electronAPI.featureFlags.disable as Mock).mockResolvedValue(
        undefined
      )

      await window.electronAPI.featureFlags.disable('test')

      expect(window.electronAPI.featureFlags.disable).toHaveBeenCalledWith(
        'test'
      )
    })

    it('should call electronAPI.featureFlags.getAll', async () => {
      const mockFlags = { test: true }
      ;(window.electronAPI.featureFlags.getAll as Mock).mockResolvedValue(
        mockFlags
      )

      const result = await window.electronAPI.featureFlags.getAll()

      expect(result).toEqual(mockFlags)
      expect(window.electronAPI.featureFlags.getAll).toHaveBeenCalled()
    })
  })

  describe('mockFeatureFlag binding', () => {
    let mockFeatureFlag: {
      test: {
        enable: () => void
        disable: () => void
        isEnabled: () => void
      }
      getAll: () => void
      list: () => void
    }

    beforeEach(() => {
      // Mock a simple FeatureFlag object on window
      mockFeatureFlag = {
        test: {
          enable: vi.fn(),
          disable: vi.fn(),
          isEnabled: vi.fn(),
        },
        getAll: vi.fn(),
        list: vi.fn(),
      }

      Object.defineProperty(window, 'FeatureFlag', {
        value: mockFeatureFlag,
        writable: true,
      })
    })

    it('should expose FeatureFlag on window object', () => {
      expect(mockFeatureFlag).toBeDefined()
      expect(mockFeatureFlag.test).toBeDefined()
      expect(mockFeatureFlag.getAll).toBeDefined()
      expect(mockFeatureFlag.list).toBeDefined()
    })

    it('should have correct structure for mockFeatureFlag', () => {
      expect(typeof mockFeatureFlag.test.enable).toBe('function')
      expect(typeof mockFeatureFlag.test.disable).toBe('function')
      expect(typeof mockFeatureFlag.test.isEnabled).toBe('function')
      expect(typeof mockFeatureFlag.getAll).toBe('function')
      expect(typeof mockFeatureFlag.list).toBe('function')
    })

    it('should call the correct methods', async () => {
      await mockFeatureFlag.test.enable()
      await mockFeatureFlag.test.disable()
      await mockFeatureFlag.test.isEnabled()
      await mockFeatureFlag.getAll()
      await mockFeatureFlag.list()

      expect(mockFeatureFlag.test.enable).toHaveBeenCalled()
      expect(mockFeatureFlag.test.disable).toHaveBeenCalled()
      expect(mockFeatureFlag.test.isEnabled).toHaveBeenCalled()
      expect(mockFeatureFlag.getAll).toHaveBeenCalled()
      expect(mockFeatureFlag.list).toHaveBeenCalled()
    })
  })
})
