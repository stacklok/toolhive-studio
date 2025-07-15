import path from 'node:path'
import { promises as fs } from 'node:fs'
import { MakerDMG } from '@electron-forge/maker-dmg'
import type { MakerOptions } from '@electron-forge/maker-base'
import type { MakerDMGConfig } from '@electron-forge/maker-dmg'

/**
 * Custom DMG Maker that includes architecture in the filename
 * to prevent conflicts when building multiple architectures
 *
 * This extends the standard MakerDMG but renames the output file
 * to include the target architecture (e.g., ToolHive-x64.dmg, ToolHive-arm64.dmg)
 */
export default class MakerDMGWithArch extends MakerDMG {
  constructor(config: MakerDMGConfig = {}, platforms?: string[]) {
    super(config, platforms)
  }

  async make(opts: MakerOptions): Promise<string[]> {
    const { targetArch } = opts

    try {
      const originalResults = await super.make(opts)
      const renamedResults: string[] = []

      for (const filePath of originalResults) {
        const dir = path.dirname(filePath)
        const ext = path.extname(filePath)
        const baseName = path.basename(filePath, ext)

        const newFileName = `${baseName}-${targetArch}${ext}`
        const newFilePath = path.join(dir, newFileName)

        await fs.rename(filePath, newFilePath)
        renamedResults.push(newFilePath)

        console.log(`Created DMG: ${newFileName}`)
      }

      return renamedResults
    } catch (error) {
      console.error(`Error building DMG for ${targetArch}:`, error)
      throw error
    }
  }
}
