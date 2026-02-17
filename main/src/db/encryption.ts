import { app } from 'electron'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import log from '../logger'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_FILE_NAME = '.toolhive-key'

let cachedKey: Buffer | null = null

function getOrCreateKey(): Buffer {
  if (cachedKey) return cachedKey

  const keyPath = path.join(app.getPath('userData'), KEY_FILE_NAME)

  try {
    if (fs.existsSync(keyPath)) {
      cachedKey = fs.readFileSync(keyPath)
      if (cachedKey.length === KEY_LENGTH) return cachedKey
      log.warn('[DB] Encryption key file has wrong length, regenerating')
    }
  } catch {
    log.warn('[DB] Could not read encryption key, generating new one')
  }

  cachedKey = crypto.randomBytes(KEY_LENGTH)
  try {
    fs.writeFileSync(keyPath, cachedKey, { mode: 0o600 })
  } catch (err) {
    log.error('[DB] Failed to persist encryption key:', err)
  }
  return cachedKey
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format: [12-byte IV][16-byte auth tag][ciphertext]
 */
export function encryptSecret(plaintext: string): Buffer {
  try {
    const key = getOrCreateKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf-8'),
      cipher.final(),
    ])
    const authTag = cipher.getAuthTag()

    return Buffer.concat([iv, authTag, encrypted])
  } catch (err) {
    log.error('[DB] Encryption failed, storing as plaintext fallback:', err)
    return Buffer.from(plaintext, 'utf-8')
  }
}

/**
 * Decrypts a buffer produced by encryptSecret.
 * Expected format: [12-byte IV][16-byte auth tag][ciphertext]
 */
export function decryptSecret(data: Buffer): string {
  // If the buffer is too short to contain IV + auth tag, treat it as plaintext
  if (data.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    return data.toString('utf-8')
  }

  try {
    const key = getOrCreateKey()
    const iv = data.subarray(0, IV_LENGTH)
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf-8')
  } catch (err) {
    log.error('[DB] Decryption failed, attempting plaintext fallback:', err)
    return data.toString('utf-8')
  }
}
