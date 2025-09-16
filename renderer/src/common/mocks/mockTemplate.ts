/* eslint-disable @typescript-eslint/no-explicit-any */
// Small utility to render the TypeScript module for generated mock fixtures.
// It conditionally adds a type import and `satisfies` clause when a response
// type name is provided.

export function buildMockModule(
  payload: any,
  options?: { opType?: string }
): string {
  const opType = options?.opType?.trim()
  const typeImport = opType
    ? `import type { ${opType} } from '@api/types.gen'\n\n`
    : ''
  const typeSatisfies = opType ? ` satisfies ${opType}` : ''
  return `${typeImport}export default ${JSON.stringify(payload, null, 2)}${typeSatisfies}\n`
}
