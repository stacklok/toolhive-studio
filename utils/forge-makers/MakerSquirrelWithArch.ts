import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import type { MakerOptions } from '@electron-forge/maker-base'
import { renameOutputsWithArch } from './rename-outputs-with-arch'

/**
 * Custom Squirrel Maker that includes architecture in the filename
 * to prevent conflicts when building multiple architectures
 *
 * Example: "ToolHive Setup.exe" → "ToolHive Setup-arm64.exe"
 */
export default class MakerSquirrelWithArch extends MakerSquirrel {
  async make(opts: MakerOptions): Promise<string[]> {
    const results = await super.make(opts)
    return renameOutputsWithArch(results, opts.targetArch)
  }
}
