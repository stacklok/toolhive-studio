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
 * Derives the request Data type name from a response type name.
 * e.g., "GetApiV1BetaGroupsResponse" -> "GetApiV1BetaGroupsData"
 */
export function deriveDataTypeName(responseTypeName: string): string {
  return responseTypeName.replace(/Responses?$/, 'Data')
}

/**
 * Renders a TypeScript module for a generated mock fixture.
 * When a response type name is provided, includes type imports
 * from '@common/api/generated/types.gen' and wraps the fixture in `AutoAPIMock<TResponse, TRequest>`
 * for type-safe test overrides with typed request parameters.
 */
export function buildMockModule(payload: unknown, opType?: string): string {
  const typeName = opType?.trim()
  const dataTypeName = typeName ? deriveDataTypeName(typeName) : undefined
  const mockName = typeName ? deriveMockName(typeName) : 'mockedResponse'

  // Type imports first, then value imports (biome import order)
  const imports = [
    ...(typeName && dataTypeName
      ? [`import type { ${typeName}, ${dataTypeName} } from '@common/api/generated/types.gen'`]
      : []),
    `import { AutoAPIMock } from '@mocks'`,
  ].join('\n')

  const typeParams =
    typeName && dataTypeName ? `<${typeName}, ${dataTypeName}>` : ''

  return `${imports}\n\nexport const ${mockName} = AutoAPIMock${typeParams}(${JSON.stringify(payload, null, 2)})\n`
}
