export function isPrerelease(
  ref: string = process.env.GITHUB_REF || ''
): boolean {
  // Match tags like v1.0.0-alpha, v1.0.0-beta.1, v1.0.0-rc.1
  return /^refs\/tags\/v?\d+\.\d+\.\d+-.+$/.test(ref)
}
