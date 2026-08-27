import { spawn } from 'node:child_process'
import { binPath } from '../../../toolhive-manager'
import { createEnhancedPath } from '../../../utils/enhanced-path'
import log from '../../../logger'
import {
  DEFAULT_THV_LLM_PROXY_PORT,
  type LlmGatewayConfigForm,
  type LlmGatewaySetupInput,
  type ThvLlmConfigJson,
} from './types'

export interface ThvCliDeps {
  binPath: string
  spawnThv: typeof spawnThvProcess
}

const defaultDeps: ThvCliDeps = {
  binPath,
  spawnThv: spawnThvProcess,
}

export function spawnThvProcess(
  args: string[],
  options: {
    detached?: boolean
    stdio?: 'pipe' | 'ignore' | 'inherit'
  } = {}
): ReturnType<typeof spawn> {
  return spawn(binPath, args, {
    stdio: options.stdio ?? 'pipe',
    detached: options.detached ?? false,
    windowsHide: true,
    env: {
      ...process.env,
      PATH: createEnhancedPath(),
      TOOLHIVE_SKIP_DESKTOP_CHECK: 'true',
    },
  })
}

async function runThvCommand(
  args: string[],
  deps: ThvCliDeps = defaultDeps,
  timeoutMs = 30_000
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    const child = deps.spawnThv(args, { stdio: 'pipe' })
    let stdout = ''
    let stderr = ''

    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`thv ${args.join(' ')} timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })

    child.on('close', (exitCode) => {
      clearTimeout(timer)
      resolve({ stdout, stderr, exitCode })
    })
  })
}

export async function readLlmConfig(
  deps: ThvCliDeps = defaultDeps
): Promise<ThvLlmConfigJson | null> {
  try {
    const { stdout, exitCode } = await runThvCommand(
      ['llm', 'config', 'show', '--format', 'json'],
      deps,
      5_000
    )
    if (exitCode !== 0) {
      log.debug('[thv-llm] llm config show failed', { exitCode })
      return null
    }
    const trimmed = stdout.trim()
    if (!trimmed) {
      return null
    }
    const parsed = JSON.parse(trimmed) as ThvLlmConfigJson
    return parsed
  } catch (error) {
    log.debug('[thv-llm] failed to read llm config', error)
    return null
  }
}

export function isLlmConfigured(
  config: ThvLlmConfigJson | null
): config is ThvLlmConfigJson {
  if (!config) return false
  return Boolean(
    config.gateway_url?.trim() &&
    config.oidc?.issuer?.trim() &&
    config.oidc?.client_id?.trim()
  )
}

export function toLlmGatewayConfigForm(
  config: ThvLlmConfigJson | null
): LlmGatewayConfigForm {
  return {
    gatewayUrl: config?.gateway_url?.trim() ?? '',
    issuer: config?.oidc?.issuer?.trim() ?? '',
    clientId: config?.oidc?.client_id?.trim() ?? '',
    audience: config?.oidc?.audience?.trim() ?? '',
    callbackPort: config?.oidc?.callback_port,
    proxyPort: config?.proxy?.listen_port ?? DEFAULT_THV_LLM_PROXY_PORT,
    configured: isLlmConfigured(config),
  }
}

export async function saveLlmConfig(
  input: LlmGatewaySetupInput,
  deps: ThvCliDeps = defaultDeps
): Promise<{ ok: boolean; error?: string }> {
  const gatewayUrl = input.gatewayUrl.trim()
  const issuer = input.issuer.trim()
  const clientId = input.clientId.trim()

  if (!gatewayUrl || !issuer || !clientId) {
    return {
      ok: false,
      error: 'Gateway URL, issuer, and client ID are required.',
    }
  }

  const args = [
    'llm',
    'config',
    'set',
    '--gateway-url',
    gatewayUrl,
    '--issuer',
    issuer,
    '--client-id',
    clientId,
  ]

  const audience = input.audience?.trim()
  if (audience) {
    args.push('--audience', audience)
  }

  if (input.callbackPort != null && input.callbackPort > 0) {
    args.push('--callback-port', String(input.callbackPort))
  }

  if (input.proxyPort != null && input.proxyPort > 0) {
    args.push('--proxy-port', String(input.proxyPort))
  }

  try {
    const { exitCode, stderr } = await runThvCommand(args, deps, 30_000)
    if (exitCode !== 0) {
      return {
        ok: false,
        error: stderr.trim() || 'thv llm config set failed',
      }
    }
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
