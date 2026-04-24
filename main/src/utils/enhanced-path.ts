import { platform } from 'node:os'

const getCommonPaths = (): string[] => {
  const currentPlatform = platform()

  switch (currentPlatform) {
    case 'darwin':
      return [
        '/Applications/Docker.app/Contents/Resources/bin',
        '/opt/homebrew/bin',
        '/usr/local/bin',
        '~/.rd/bin',
      ]
    case 'linux':
      return ['/usr/local/bin', '/opt/homebrew/bin', '/snap/bin', '~/.rd/bin']
    case 'win32':
      return [
        'C:\\Program Files\\Docker\\Docker\\resources\\bin',
        'C:\\Program Files\\RedHat\\Podman',
      ]
    default:
      return []
  }
}

const expandPath = (path: string): string =>
  path.startsWith('~')
    ? path.replace('~', process.env.HOME || process.env.USERPROFILE || '')
    : path

export const createEnhancedPath = (): string => {
  const commonPaths = getCommonPaths().map(expandPath)
  const currentPath = process.env.PATH || ''
  const separator = platform() === 'win32' ? ';' : ':'

  return [...commonPaths, ...currentPath.split(separator)]
    .filter(Boolean)
    .join(separator)
}
