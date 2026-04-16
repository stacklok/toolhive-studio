/**
 * Azure Trusted Signing configuration for `@electron/windows-sign`.
 *
 * Follows the official Electron Forge guide:
 * https://www.electronforge.io/guides/code-signing/code-signing-windows#using-azure-trusted-signing
 *
 * The returned config is a plain options object consumed by `@electron/windows-sign`
 * (via `signWithParams`), which invokes `signtool.exe` with the Azure Code Signing
 * DLib to sign files through Azure Trusted Signing.
 *
 * Authentication to Azure Trusted Signing is handled by the Azure SDK's
 * `DefaultAzureCredential` inside the DLib. In CI this picks up the OIDC
 * workload-identity token exported by `azure/login@v2` (AZURE_CLIENT_ID,
 * AZURE_TENANT_ID, AZURE_FEDERATED_TOKEN_FILE), so no client secret is
 * required.
 *
 * Important caveat: `AZURE_CODE_SIGNING_DLIB` and `AZURE_METADATA_JSON` must
 * not contain spaces, or signing will fail. See
 * https://github.com/electron/windows-sign/issues/45
 */

// `HASHES` is a const enum inside `@electron/windows-sign`; importing it as
// a type and casting the literal matches the official Electron Forge guide
// and keeps string values structurally compatible with `WindowsSignOptions`.
import type { HASHES } from '@electron/windows-sign/dist/esm/types'

type AzureSignConfig = {
  signToolPath?: string
  signWithParams: string
  timestampServer: string
  hashes: HASHES[]
}

export function getAzureTrustedSigningConfig(): AzureSignConfig | undefined {
  const dlib = process.env.AZURE_CODE_SIGNING_DLIB
  const metadata = process.env.AZURE_METADATA_JSON
  if (!dlib || !metadata) return undefined

  return {
    ...(process.env.SIGNTOOL_PATH
      ? { signToolPath: process.env.SIGNTOOL_PATH }
      : {}),
    signWithParams: `/v /debug /dlib ${dlib} /dmdf ${metadata}`,
    timestampServer: 'http://timestamp.acs.microsoft.com',
    hashes: ['sha256' as HASHES],
  }
}
