import { EventEmitter } from 'node:events'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(() => '/tmp'),
  },
}))

vi.mock('../../../../logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../../../../toolhive-manager', () => ({
  binPath: '/tmp/thv',
}))

vi.mock('../../../../utils/enhanced-path', () => ({
  createEnhancedPath: () => '/tmp/bin',
}))

import {
  isLlmConfigured,
  readLlmConfig,
  saveLlmConfig,
  toLlmGatewayConfigForm,
  type ThvCliDeps,
} from '../thv-cli'

function fakeChild(
  options: {
    stdout?: string
    stderr?: string
    exitCode?: number
    error?: Error
  } = {}
) {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter
    stderr: EventEmitter
    kill: ReturnType<typeof vi.fn>
  }
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  child.kill = vi.fn()

  queueMicrotask(() => {
    if (options.error) {
      child.emit('error', options.error)
      return
    }
    if (options.stdout) {
      child.stdout.emit('data', Buffer.from(options.stdout))
    }
    if (options.stderr) {
      child.stderr.emit('data', Buffer.from(options.stderr))
    }
    child.emit('close', options.exitCode ?? 0)
  })

  return child
}

describe('thv-cli llm config', () => {
  let spawnThv: ReturnType<typeof vi.fn>
  let deps: ThvCliDeps

  beforeEach(() => {
    spawnThv = vi.fn()
    deps = {
      binPath: '/tmp/thv',
      spawnThv: spawnThv as ThvCliDeps['spawnThv'],
    }
  })

  describe('isLlmConfigured', () => {
    it('requires gateway URL, issuer, and client ID', () => {
      expect(isLlmConfigured(null)).toBe(false)
      expect(isLlmConfigured({})).toBe(false)
      expect(
        isLlmConfigured({
          gateway_url: 'https://gw.example',
          oidc: { issuer: 'https://issuer', client_id: 'client' },
        })
      ).toBe(true)
    })
  })

  describe('toLlmGatewayConfigForm', () => {
    it('maps JSON config onto the settings form', () => {
      expect(
        toLlmGatewayConfigForm({
          gateway_url: ' https://gw.example ',
          oidc: {
            issuer: ' https://issuer ',
            client_id: ' client ',
            audience: ' api://gw ',
            callback_port: 9090,
          },
          proxy: { listen_port: 15000 },
        })
      ).toEqual({
        gatewayUrl: 'https://gw.example',
        issuer: 'https://issuer',
        clientId: 'client',
        audience: 'api://gw',
        callbackPort: 9090,
        proxyPort: 15000,
        configured: true,
      })
    })

    it('uses empty defaults when config is missing', () => {
      expect(toLlmGatewayConfigForm(null)).toMatchObject({
        gatewayUrl: '',
        issuer: '',
        clientId: '',
        proxyPort: 14000,
        configured: false,
      })
    })
  })

  describe('readLlmConfig', () => {
    it('parses JSON from thv llm config show', async () => {
      spawnThv.mockReturnValue(
        fakeChild({
          stdout: JSON.stringify({
            gateway_url: 'https://gw.example',
            oidc: { issuer: 'https://issuer', client_id: 'client' },
          }),
        })
      )

      await expect(readLlmConfig(deps)).resolves.toEqual({
        gateway_url: 'https://gw.example',
        oidc: { issuer: 'https://issuer', client_id: 'client' },
      })
      expect(spawnThv).toHaveBeenCalledWith(
        ['llm', 'config', 'show', '--format', 'json'],
        { stdio: 'pipe' }
      )
    })

    it('returns null when the command fails', async () => {
      spawnThv.mockReturnValue(fakeChild({ exitCode: 1, stderr: 'boom' }))
      await expect(readLlmConfig(deps)).resolves.toBeNull()
    })

    it('returns null when stdout is empty', async () => {
      spawnThv.mockReturnValue(fakeChild({ stdout: '  ' }))
      await expect(readLlmConfig(deps)).resolves.toBeNull()
    })

    it('returns null when JSON is invalid', async () => {
      spawnThv.mockReturnValue(fakeChild({ stdout: '{not-json' }))
      await expect(readLlmConfig(deps)).resolves.toBeNull()
    })

    it('returns null when the process fails to start', async () => {
      spawnThv.mockReturnValue(fakeChild({ error: new Error('ENOENT') }))
      await expect(readLlmConfig(deps)).resolves.toBeNull()
    })
  })

  describe('saveLlmConfig', () => {
    it('rejects missing required fields', async () => {
      await expect(
        saveLlmConfig(
          { gatewayUrl: '', issuer: 'https://issuer', clientId: 'client' },
          deps
        )
      ).resolves.toEqual({
        ok: false,
        error: 'Gateway URL, issuer, and client ID are required.',
      })
      expect(spawnThv).not.toHaveBeenCalled()
    })

    it('passes optional flags to thv llm config set', async () => {
      spawnThv.mockReturnValue(fakeChild({ exitCode: 0 }))

      await expect(
        saveLlmConfig(
          {
            gatewayUrl: 'https://gw.example',
            issuer: 'https://issuer',
            clientId: 'client',
            audience: 'api://gw',
            callbackPort: 8080,
            proxyPort: 14000,
          },
          deps
        )
      ).resolves.toEqual({ ok: true })

      expect(spawnThv).toHaveBeenCalledWith(
        [
          'llm',
          'config',
          'set',
          '--gateway-url',
          'https://gw.example',
          '--issuer',
          'https://issuer',
          '--client-id',
          'client',
          '--audience',
          'api://gw',
          '--callback-port',
          '8080',
          '--proxy-port',
          '14000',
        ],
        { stdio: 'pipe' }
      )
    })

    it('omits optional flags when they are empty', async () => {
      spawnThv.mockReturnValue(fakeChild({ exitCode: 0 }))

      await expect(
        saveLlmConfig(
          {
            gatewayUrl: 'https://gw.example',
            issuer: 'https://issuer',
            clientId: 'client',
          },
          deps
        )
      ).resolves.toEqual({ ok: true })

      expect(spawnThv).toHaveBeenCalledWith(
        [
          'llm',
          'config',
          'set',
          '--gateway-url',
          'https://gw.example',
          '--issuer',
          'https://issuer',
          '--client-id',
          'client',
        ],
        { stdio: 'pipe' }
      )
    })

    it('returns stderr when thv exits non-zero', async () => {
      spawnThv.mockReturnValue(
        fakeChild({ exitCode: 2, stderr: ' invalid issuer \n' })
      )

      await expect(
        saveLlmConfig(
          {
            gatewayUrl: 'https://gw.example',
            issuer: 'https://issuer',
            clientId: 'client',
          },
          deps
        )
      ).resolves.toEqual({
        ok: false,
        error: 'invalid issuer',
      })
    })

    it('returns a fallback error when stderr is empty', async () => {
      spawnThv.mockReturnValue(fakeChild({ exitCode: 1 }))

      await expect(
        saveLlmConfig(
          {
            gatewayUrl: 'https://gw.example',
            issuer: 'https://issuer',
            clientId: 'client',
          },
          deps
        )
      ).resolves.toEqual({
        ok: false,
        error: 'thv llm config set failed',
      })
    })

    it('returns the spawn error message when the process fails to start', async () => {
      spawnThv.mockReturnValue(fakeChild({ error: new Error('ENOENT') }))

      await expect(
        saveLlmConfig(
          {
            gatewayUrl: 'https://gw.example',
            issuer: 'https://issuer',
            clientId: 'client',
          },
          deps
        )
      ).resolves.toEqual({
        ok: false,
        error: 'ENOENT',
      })
    })
  })
})
