import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import log from './logger'

const execAsync = promisify(exec)

interface ContainerEngineStatus {
  docker: boolean
  podman: boolean
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

const checkCommand = async (
  command: string,
  timeout = 5000
): Promise<boolean> => {
  try {
    await execAsync(command, { timeout })
    return true
  } catch {
    log.error(`container engine command failed: ${command}`)
    return false
  }
}

// Individual engine checkers
const checkDocker = async (): Promise<EngineCheckResult> => {
  // docker ps requires daemon to be running and accessible
  const available = await checkCommand('docker ps')
  return createEngineResult('docker', available)
}

const checkPodman = async (): Promise<EngineCheckResult> => {
  // podman ps checks if podman can actually manage containers
  const available = await checkCommand('podman ps')
  return createEngineResult('podman', available)
}

const combineEngineResults = (
  results: EngineCheckResult[]
): ContainerEngineStatus => {
  const dockerResult = results.find((r) => r.name === 'docker')
  const podmanResult = results.find((r) => r.name === 'podman')

  const docker = dockerResult?.available ?? false
  const podman = podmanResult?.available ?? false

  return {
    docker,
    podman,
    available: docker || podman,
  }
}

// Main function - orchestrates the checks
export const checkContainerEngine =
  async (): Promise<ContainerEngineStatus> => {
    const engineCheckers = [checkDocker, checkPodman]

    const results = await Promise.all(
      engineCheckers.map((checker) => checker())
    )

    return combineEngineResults(results)
  }
