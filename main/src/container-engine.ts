import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { platform } from 'node:os'
import log from './logger'

const execAsync = promisify(exec)

// Container engine installation paths
const WINDOWS_CONTAINER_PATHS = [
  // Docker Desktop
  'C:\\Program Files\\Docker\\Docker\\resources\\bin',
  // Podman
  'C:\\Program Files\\RedHat\\Podman',
  // Rancher Desktop
  '%APPDATA%\\rancher-desktop\\bin',
  '%USERPROFILE%\\AppData\\Roaming\\rancher-desktop\\bin',
] as const

const UNIX_CONTAINER_PATHS = [
  // System Docker/Podman
  '/usr/local/bin',
  // Homebrew (Apple Silicon)
  '/opt/homebrew/bin',
  // MacPorts
  '/opt/local/bin',
  // Docker Desktop User install
  '~/.docker/bin',
  // Snap packages
  '/snap/bin',
  // Flatpak
  '/var/lib/flatpak/exports/bin',
  // Rancher Desktop user install
  '~/.rd/bin',
  // Rancher Desktop system install (Linux)
  '/opt/rancher-desktop/bin',
  // Rancher Desktop (macOS)
  '/Applications/Rancher Desktop.app/Contents/Resources/resources/darwin/bin',
] as const

interface ContainerEngineStatus {
  docker: boolean
  podman: boolean
  // Rancher Desktop (containerd)
  nerdctl: boolean
  available: boolean
}

interface EngineCheckResult {
  name: string
  available: boolean
}

const createEngineResult = (
  name: string,
  available: boolean
): EngineCheckResult => ({
  name,
  available,
})

// Expand environment variables and home directory paths
const expandPath = (path: string): string => {
  const homeDir = process.env.HOME || process.env.USERPROFILE || ''

  return path
    .replace(/^~/, homeDir)
    .replace(/%APPDATA%/g, process.env.APPDATA || '')
    .replace(/%USERPROFILE%/g, homeDir)
}

// Find executable using which/where command with enhanced PATH
const findExecutable = async (command: string): Promise<string | null> => {
  const isWindows = platform() === 'win32'
  const whichCommand = isWindows ? 'where' : 'which'

  // Get platform-specific paths and expand environment variables
  const platformPaths = isWindows
    ? WINDOWS_CONTAINER_PATHS
    : UNIX_CONTAINER_PATHS
  const additionalPaths = platformPaths.map(expandPath)

  const currentPath = process.env.PATH || ''
  const enhancedPath = [
    ...additionalPaths,
    ...currentPath.split(isWindows ? ';' : ':'),
  ]
    .filter(Boolean)
    .join(isWindows ? ';' : ':')

  try {
    const { stdout } = await execAsync(`${whichCommand} ${command}`, {
      env: {
        ...process.env,
        PATH: enhancedPath,
      },
    })
    const path = stdout.trim().split('\n')[0]

    if (path) {
      log.info(`Found ${command} at: ${path}`)
      return path
    }

    return null
  } catch {
    return null
  }
}

// Execute command with found executable path
const executeCommand = async (command: string): Promise<boolean> => {
  const engineName = command.split(' ')[0]
  if (!engineName) {
    return false
  }

  // Find the executable first
  const executablePath = await findExecutable(engineName)
  if (!executablePath) {
    return false
  }

  // Replace command name with full path
  const fullCommand = command.replace(engineName, executablePath)

  try {
    await execAsync(fullCommand)
    return true
  } catch {
    return false
  }
}

// Engine checker functions (pure)
const checkEngine =
  (engineName: string) => async (): Promise<EngineCheckResult> => {
    const command = `${engineName} ps`
    const available = await executeCommand(command)
    return createEngineResult(engineName, available)
  }

const checkDocker = checkEngine('docker')
const checkPodman = checkEngine('podman')
// Rancher Desktop containerd
const checkNerdctl = checkEngine('nerdctl')

const combineEngineResults = (
  results: EngineCheckResult[]
): ContainerEngineStatus => {
  const getResult = (name: string) =>
    results.find((r) => r.name === name)?.available ?? false

  const docker = getResult('docker')
  const podman = getResult('podman')
  const nerdctl = getResult('nerdctl')

  return {
    docker,
    podman,
    nerdctl,
    available: docker || podman || nerdctl,
  }
}

const getSuccessfulResults = (
  results: PromiseSettledResult<EngineCheckResult>[]
): EngineCheckResult[] =>
  results
    .filter(
      (result): result is PromiseFulfilledResult<EngineCheckResult> =>
        result.status === 'fulfilled'
    )
    .map((result) => result.value)

export const checkContainerEngine =
  async (): Promise<ContainerEngineStatus> => {
    const engineCheckers = [checkDocker, checkPodman, checkNerdctl]

    const results = await Promise.allSettled(
      engineCheckers.map((checker) => checker())
    )

    const successfulResults = getSuccessfulResults(results)
    const status = combineEngineResults(successfulResults)

    const foundEngines = successfulResults
      .filter((r) => r.available)
      .map((r) => r.name)
    if (foundEngines.length > 0) {
      log.info(`Container engines detected: ${foundEngines.join(', ')}`)
    }

    return status
  }
