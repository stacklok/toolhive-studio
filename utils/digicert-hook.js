/**
 * DigiCert KeyLocker signing hook for @electron/windows-sign
 * This module exports a function that signs files using DigiCert smctl.exe
 */

const { execSync } = require('child_process')

/**
 * Signs a file using DigiCert KeyLocker
 * @param {string} filePath - Absolute path to the file to sign
 * @returns {Promise<void>}
 */
async function signWithDigiCert(filePath) {
  console.log(`Signing ${filePath} using DigiCert KeyLocker...`)

  const fingerprint = process.env.SM_CODE_SIGNING_CERT_SHA1_HASH
  if (!fingerprint) {
    throw new Error('SM_CODE_SIGNING_CERT_SHA1_HASH environment variable is required')
  }

  const signCommand = [
    '"C:\\Program Files\\DigiCert\\DigiCert Keylocker Tools\\smctl.exe"',
    'sign',
    '--fingerprint',
    fingerprint,
    '--input',
    `"${filePath}"`
  ].join(' ')

  console.log(`Executing: ${signCommand}`)

  try {
    execSync(signCommand, { stdio: 'inherit' })
    console.log(`Successfully signed ${filePath}`)
  } catch (error) {
    console.error(`Failed to sign ${filePath}:`, error.message || error)
    throw error
  }
}

module.exports = signWithDigiCert