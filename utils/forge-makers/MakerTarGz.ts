import path from 'node:path'
import { promises as fs } from 'node:fs'
import tar from 'tar'

import { MakerBase, MakerOptions } from '@electron-forge/maker-base'
import type { ForgePlatform } from '@electron-forge/shared-types'

/**
 * Electron-Forge Maker that outputs a plain .tar.gz archive.
 *
 * Works on any platform because it relies on the cross-platform `tar` npm package,
 * not the system `tar` binary.
 */
export default class MakerTarGz extends MakerBase<Record<string, never>> {
  /** Appears in Forge’s console output */
  name = 'targz'

  /** Platforms to run on (trim to `['linux']` if you only need Linux tarballs) */
  defaultPlatforms: ForgePlatform[] = ['linux', 'darwin', 'win32']

  /** No external dependencies → always supported */
  isSupportedOnCurrentPlatform(): boolean {
    return true
  }

  /** Called by Forge for each platform/arch build */
  async make({
    dir, // packaged app folder
    makeDir, // <project>/out/make/<platform>/<arch>
    packageJSON,
    targetArch,
    targetPlatform,
  }: MakerOptions): Promise<string[]> {
    const fileName = `${packageJSON.name}-${packageJSON.version}-${targetPlatform}-${targetArch}.tar.gz`
    const outPath = path.join(makeDir, fileName)

    // Create parent directories & remove an existing file if one is there.
    // (Built-in makers call this helper too.)
    await this.ensureFile(outPath)

    // Pack the entire `dir` folder into outPath
    await tar.c(
      {
        gzip: true,
        file: outPath,
        cwd: dir,
        portable: true, // fixed perms & mtimes for reproducible builds
      },
      ['.']
    )

    // Forge expects an array of paths it can publish
    return [outPath]
  }

  /**
   * Same helper the built-in makers use.
   * Creates parent folders and deletes an existing file so tar can recreate it.
   */
  private async ensureFile(filePath: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    try {
      await fs.unlink(filePath)
    } catch {
      /* ignore if file didn’t exist */
    }
  }
}
