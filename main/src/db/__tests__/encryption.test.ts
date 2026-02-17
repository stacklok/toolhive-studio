import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/tmp/toolhive-test') },
}))

vi.mock('../../logger', () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

import { encryptSecret, decryptSecret } from '../encryption'

describe('encryption', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('encryptSecret / decryptSecret', () => {
    it('round-trips a secret through encrypt and decrypt', () => {
      const original = 'sk-super-secret-api-key-12345'
      const encrypted = encryptSecret(original)

      expect(Buffer.isBuffer(encrypted)).toBe(true)
      expect(encrypted.toString('utf-8')).not.toBe(original)

      const decrypted = decryptSecret(encrypted)
      expect(decrypted).toBe(original)
    })

    it('produces different ciphertext for the same input (random IV)', () => {
      const secret = 'my-secret'
      const a = encryptSecret(secret)
      const b = encryptSecret(secret)
      expect(a.equals(b)).toBe(false)

      expect(decryptSecret(a)).toBe(secret)
      expect(decryptSecret(b)).toBe(secret)
    })

    it('handles empty string', () => {
      const encrypted = encryptSecret('')
      expect(decryptSecret(encrypted)).toBe('')
    })

    it('handles unicode content', () => {
      const secret = 'p@$$w0rd-with-emojis-🔑🔒'
      const encrypted = encryptSecret(secret)
      expect(decryptSecret(encrypted)).toBe(secret)
    })
  })

  describe('decryptSecret fallback', () => {
    it('returns plaintext for buffers too short to be encrypted', () => {
      const plaintext = Buffer.from('short', 'utf-8')
      expect(decryptSecret(plaintext)).toBe('short')
    })
  })
})
