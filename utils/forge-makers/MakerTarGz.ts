import path from 'node:path'
import { promises as fs } from 'node:fs'
import * as tar from 'tar'
import os from 'node:os'

import { MakerBase } from '@electron-forge/maker-base'
import type { MakerOptions } from '@electron-forge/maker-base'
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
    const baseName = `${packageJSON.name}-${targetPlatform}-${targetArch}`
    const fileName = `${baseName}.tar.gz`
    const outPath = path.join(makeDir, fileName)

    // Create parent directories & remove an existing file if one is there.
    await this.ensureFile(outPath)

    // Create a temp directory to stage the folder structure
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-targz-'))
    const folderInTar = path.join(tmpDir, baseName)
    await fs.mkdir(folderInTar)

    // Copy all contents of dir into folderInTar
    const copyRecursive = async (src: string, dest: string) => {
      const entries = await fs.readdir(src, { withFileTypes: true })
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)
        if (entry.isDirectory()) {
          await fs.mkdir(destPath)
          await copyRecursive(srcPath, destPath)
        } else if (entry.isSymbolicLink()) {
          const link = await fs.readlink(srcPath)
          await fs.symlink(link, destPath)
        } else {
          await fs.copyFile(srcPath, destPath)
        }
      }
    }
    await copyRecursive(dir, folderInTar)

    // Pack the folderInTar (from its parent) so the tarball contains a single top-level folder
    await tar.c(
      {
        gzip: true,
        file: outPath,
        cwd: tmpDir,
        portable: true, // fixed perms & mtimes for reproducible builds
      },
      [baseName]
    )

    // Clean up temp directory
    await fs.rm(tmpDir, { recursive: true, force: true })

    // Forge expects an array of paths it can publish
    return [outPath]
  }

  /**
   * Same helper the built-in makers use.
   * Creates parent folders and deletes an existing file so tar can recreate it.
   */
  public async ensureFile(filePath: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    try {
      await fs.unlink(filePath)
    } catch {
      /* ignore if file didn’t exist */
    }
  }
}
