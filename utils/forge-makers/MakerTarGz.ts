import path from 'node:path'
import tar from 'tar'
import { MakerBase, MakerOptions } from '@electron-forge/maker-base'
import type { ForgePlatform } from '@electron-forge/shared-types'

export default class MakerTarGz extends MakerBase<Record<string, never>> {
  /** Appears in Forge’s console output */
  name = 'targz'

  /** Platforms this maker should run on – tweak if you only need Linux */
  defaultPlatforms: ForgePlatform[] = ['linux', 'darwin', 'win32']

  /** No external tools needed; always OK */
  isSupportedOnCurrentPlatform(): boolean {
    return true
  }

  /** Build the archive and return its path */
  async make({
    dir,
    makeDir,
    packageJSON,
    targetArch,
    targetPlatform,
  }: MakerOptions): Promise<string[]> {
    const fileName = `${packageJSON.name}-${packageJSON.version}-${targetPlatform}-${targetArch}.tar.gz`
    const outPath = path.join(makeDir, fileName)

    await tar.c(
      {
        gzip: true,
        file: outPath,
        cwd: dir, // packaged app root
        portable: true, // reproducible permissions / mtimes
      },
      ['.']
    )

    return [outPath]
  }
}
