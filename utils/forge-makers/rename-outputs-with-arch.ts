import path from 'node:path'
import { promises as fs } from 'node:fs'

/**
 * Renames maker output files to include the target architecture,
 * preventing filename collisions when building for multiple architectures.
 *
 * Example: "ToolHive Setup.exe" → "ToolHive Setup-arm64.exe"
 */
export async function renameOutputsWithArch(
  filePaths: string[],
  targetArch: string
): Promise<string[]> {
  const renamedResults: string[] = []

  for (const filePath of filePaths) {
    const dir = path.dirname(filePath)
    const ext = path.extname(filePath)
    const baseName = path.basename(filePath, ext)

    const newFileName = `${baseName}-${targetArch}${ext}`
    const newFilePath = path.join(dir, newFileName)

    await fs.rename(filePath, newFilePath)
    renamedResults.push(newFilePath)
  }

  return renamedResults
}
