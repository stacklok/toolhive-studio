/**
 * Renders a TypeScript module for a generated mock fixture.
 * If a response type name is provided, adds a type-only import from
 * `@api/types.gen` and a `satisfies` clause on the default export
 * to enforce the expected response type.
 */
export function buildMockModule(
  payload: unknown,
  options?: { opType?: string }
): string {
  const opType = options?.opType?.trim()
  const typeImport = opType
    ? `import type { ${opType} } from '@api/types.gen'\n\n`
    : ''
  const typeSatisfies = opType ? ` satisfies ${opType}` : ''
  return `${typeImport}export default ${JSON.stringify(payload, null, 2)}${typeSatisfies}\n`
}
