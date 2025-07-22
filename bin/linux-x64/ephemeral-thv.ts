#!/usr/bin / env - S npx tsx
/**
 * Ephemeral `thv` runner in a throw-away Docker-in-Docker helper.
 * • all container ports are host ports (host-network mode)
 * • no need to call withExposedPorts / hard-wire ports
 * • streams `serve` output live; tears down on one-shots
 * • works unmodified on GitHub Actions & Docker Desktop
 */
import { GenericContainer } from 'testcontainers'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

// Clean up any stray DOCKER_HOST (Electron, etc.)
delete process.env.DOCKER_HOST

const __dirname = dirname(fileURLToPath(import.meta.url))
const binaryPath = join(__dirname, 'thv') // your host-built binary
const args = process.argv.slice(2) // e.g. ['serve','--port','3333']
const isServe = args[0] === 'serve'

;(async () => {
  // 1) start DinD in host-network so container's port N === host port N
  const container = await new GenericContainer('docker:26-dind')
    .withPrivilegedMode() // required for DinD
    .withNetworkMode('host') // ↪︎ container ⇄ host port 1:1
    .withCopyFilesToContainer([
      {
        // inject your binary
        source: binaryPath,
        target: '/usr/local/bin/thv',
        mode: 0o755,
      },
    ])
    .start()

  // 2) wait until Docker‐in‐Docker is ready
  await container.exec([
    'sh',
    '-c',
    'until docker info >/dev/null 2>&1; do sleep 0.2; done',
  ])

  if (isServe) {
    // 3a) stream serve logs live
    const exec = await container.exec(['/usr/local/bin/thv', ...args], {
      stream: true,
    })
    exec.output.pipe(process.stdout)

    // keep the container alive until you Ctrl-C
    process.on('SIGINT', async () => {
      await container.stop()
      process.exit(0)
    })
    process.on('SIGTERM', async () => {
      await container.stop()
      process.exit(0)
    })
  } else {
    // 3b) one-shot commands: run it, print output, then stop+exit
    const { exitCode = 1, output } = await container.exec([
      '/usr/local/bin/thv',
      ...args,
    ])
    process.stdout.write(output)
    await container.stop()
    process.exit(exitCode)
  }
})().catch(async (err) => {
  console.error('Failed to run thv in container:', err)
  process.exit(1)
})
