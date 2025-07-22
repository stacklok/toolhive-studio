import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { platform } from 'node:os'
import log from './logger'

const execAsync = promisify(exec)

interface ContainerEngineStatus {
  docker: boolean
  podman: boolean
  rancherDesktop: boolean
  available: boolean
}

// Common installation paths by platform
const getCommonPaths = (): string[] => {
  const currentPlatform = platform()

  switch (currentPlatform) {
    case 'darwin':
      return [
        '/Applications/Rancher Desktop.app/Contents/Resources/resources/darwin/bin',
        '/Applications/Docker.app/Contents/Resources/bin',
        '/opt/homebrew/bin',
        '/usr/local/bin',
        '~/.rd/bin',
      ]
    case 'linux':
      return [
        '/usr/local/bin',
        '/opt/homebrew/bin',
        '/snap/bin',
        '~/.rd/bin',
        '/opt/rancher-desktop/bin',
      ]
    case 'win32':
      return [
        'C:\\Program Files\\Rancher Desktop\\resources\\resources\\win32\\bin',
        'C:\\Program Files\\Docker\\Docker\\resources\\bin',
        'C:\\Program Files\\RedHat\\Podman',
      ]
    default:
      return []
  }
}

const expandPath = (path: string): string =>
  path.startsWith('~')
    ? path.replace('~', process.env.HOME || process.env.USERPROFILE || '')
    : path

const createEnhancedPath = (): string => {
  const commonPaths = getCommonPaths().map(expandPath)
  const currentPath = process.env.PATH || ''
  const separator = platform() === 'win32' ? ';' : ':'

  return [...commonPaths, ...currentPath.split(separator)]
    .filter(Boolean)
    .join(separator)
}

const tryCommand = async (
  command: string,
  timeoutMs = 8000
): Promise<boolean> => {
  try {
    await execAsync(command, { timeout: timeoutMs })
    return true
  } catch {
    try {
      await execAsync(command, {
        timeout: timeoutMs,
        env: { ...process.env, PATH: createEnhancedPath() },
      })
      return true
    } catch {
      return false
    }
  }
}

const getCommandName = (base: string): string =>
  platform() === 'win32' ? `${base}.exe` : base

const checkDocker = (): Promise<boolean> =>
  tryCommand(`${getCommandName('docker')} ps`)

const checkPodman = (): Promise<boolean> =>
  tryCommand(`${getCommandName('podman')} ps`)

const checkRancherDesktop = (): Promise<boolean> =>
  tryCommand(`${getCommandName('rdctl')} version`, 5000)

const createStatus = (
  docker: boolean,
  podman: boolean,
  rancherDesktop: boolean
): ContainerEngineStatus => ({
  docker,
  podman,
  rancherDesktop,
  available: docker || podman,
})

export const checkContainerEngine =
  async (): Promise<ContainerEngineStatus> => {
    const [docker, podman, rancherDesktop] = await Promise.all([
      checkDocker(),
      checkPodman(),
      checkRancherDesktop(),
    ])

    const status = createStatus(docker, podman, rancherDesktop)

    if (!status.available) {
      log.warn('No container engines detected')
    }

    return status
  }
