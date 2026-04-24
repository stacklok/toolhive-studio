import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { platform } from 'node:os'
import log from './logger'
import { createEnhancedPath } from './utils/enhanced-path'

const execAsync = promisify(exec)

interface ContainerEngineStatus {
  docker: boolean
  podman: boolean
  available: boolean
}

const tryCommand = async (command: string): Promise<boolean> => {
  try {
    await execAsync(command)
    return true
  } catch {
    try {
      await execAsync(command, {
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

const createStatus = (
  docker: boolean,
  podman: boolean
): ContainerEngineStatus => ({
  docker,
  podman,
  available: docker || podman,
})

export const checkContainerEngine =
  async (): Promise<ContainerEngineStatus> => {
    const [docker, podman] = await Promise.allSettled([
      checkDocker(),
      checkPodman(),
    ]).then((results) =>
      results.map((result) => {
        if (result.status === 'rejected') return false
        return result.value
      })
    )

    const status = createStatus(!!docker, !!podman)

    if (!status.available) {
      log.warn('No container engines detected')
    }

    return status
  }
