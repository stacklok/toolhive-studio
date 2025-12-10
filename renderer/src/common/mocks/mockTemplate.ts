/**
 * Derives a mock export name from a response type name.
 * e.g., "GetApiV1BetaGroupsResponse" -> "mockedGetApiV1BetaGroups"
 */
export function deriveMockName(responseTypeName: string): string {
  // Strip "Response" or "Responses" suffix and add "mocked" prefix
  const baseName = responseTypeName
    .replace(/Responses?$/, '')
    .replace(/^Get/, 'get')
    .replace(/^Post/, 'post')
    .replace(/^Put/, 'put')
    .replace(/^Patch/, 'patch')
    .replace(/^Delete/, 'delete')

  return `mocked${baseName.charAt(0).toUpperCase()}${baseName.slice(1)}`
}

/**
 * Renders a TypeScript module for a generated mock fixture.
 * When a response type name is provided, includes a type import
 * from '@api/types.gen' and wraps the fixture in `AutoAPIMock<T>`
 * for type-safe test overrides.
 */
export function buildMockModule(payload: unknown, opType?: string): string {
  const typeName = opType?.trim()
  const mockName = typeName ? deriveMockName(typeName) : 'mockedResponse'

  // Type imports first, then value imports (biome import order)
  const imports = [
    ...(typeName ? [`import type { ${typeName} } from '@api/types.gen'`] : []),
    `import { AutoAPIMock } from '@mocks'`,
  ].join('\n')

  const typeParam = typeName ? `<${typeName}>` : ''

  return `${imports}\n\nexport const ${mockName} = AutoAPIMock${typeParam}(${JSON.stringify(payload, null, 2)})\n`
}
