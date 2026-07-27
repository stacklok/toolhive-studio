import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

const { cpSyncMock } = vi.hoisted(() => ({
  cpSyncMock: vi.fn(),
}))

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    cpSync: cpSyncMock,
  }
})

import config from '../forge.config'

/**
 * Regression test for: Fedora RPM install conflicts with podman-docker
 * because the RPM hard-requires Docker.
 *
 * The previous config declared `requires: ['docker >= 20.10']`, which on
 * Fedora forces dnf to install moby-engine. moby-engine declares
 * `Provides: docker`, but it conflicts with the `podman-docker` package
 * that users running Podman as their container runtime have installed.
 *
 * ToolHive supports Podman as a runtime, so the RPM must not hard-pin
 * the `docker` package as the only acceptable dependency.
 */
describe('forge.config — RPM maker dependency', () => {
  it('does not hard-require the docker package (would conflict with podman-docker on Fedora)', async () => {
    // Class instances of MakerRpm expose `name === 'rpm'`; plain-object
    // makers would use `name === '@electron-forge/maker-rpm'`.
    const rpmMaker = config.makers?.find(
      (m) =>
        (m as { name?: string }).name === 'rpm' ||
        (m as { name?: string }).name === '@electron-forge/maker-rpm'
    )

    expect(rpmMaker, 'RPM maker should be registered').toBeDefined()

    // MakerBase stores the user-provided config on `configOrConfigFetcher`
    // until `prepareConfig()` is called (which copies it to `config`).
    await (
      rpmMaker as unknown as { prepareConfig: (arch: string) => Promise<void> }
    ).prepareConfig('x64')

    const rpmConfig = (
      rpmMaker as unknown as { config: { options?: { requires?: string[] } } }
    ).config
    const requires = rpmConfig.options?.requires ?? []

    const hardDockerRequire = requires.find((r) =>
      /^docker(\s|$|>=|<=|=|>|<)/.test(r)
    )
    expect(
      hardDockerRequire,
      `RPM "Requires: ${hardDockerRequire}" forces moby-engine on Fedora and conflicts with podman-docker. Use a boolean dependency or remove the requirement so Podman setups can install the RPM.`
    ).toBeUndefined()
  })
})

describe('forge.config — packageAfterCopy native modules', () => {
  it('copies only better-sqlite3 (v13 ships bundled N-API prebuilds, no bindings deps)', async () => {
    cpSyncMock.mockClear()

    const hook = config.hooks?.packageAfterCopy
    expect(hook).toBeTypeOf('function')

    await hook!({} as never, '/build/path')

    expect(cpSyncMock).toHaveBeenCalledTimes(1)
    expect(cpSyncMock).toHaveBeenCalledWith(
      path.join(process.cwd(), 'node_modules', 'better-sqlite3'),
      path.join('/build/path', 'node_modules', 'better-sqlite3'),
      { recursive: true }
    )
  })
})
