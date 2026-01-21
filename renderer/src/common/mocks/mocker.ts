// This file generates fallback mocks automatically to avoid
// having to create all mocks manually. You can still manually write
// mock handlers that override the behavior of these
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import openapi from '../../../../api/openapi.json'
import fs from 'fs'
import { JSONSchemaFaker as jsf } from 'json-schema-faker'
import { http, HttpResponse } from 'msw'
import path from 'path'
import { fileURLToPath } from 'url'
import type { AutoAPIMockInstance } from './autoAPIMock'
import { buildMockModule, deriveMockName } from './mockTemplate'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FOLDER_PATH = __dirname
const FIXTURES_PATH = `${FOLDER_PATH}/fixtures`
const FIXTURE_EXT = 'ts'

jsf.option({ alwaysFakeOptionals: true })
jsf.option({ fillProperties: true })
jsf.option({ minItems: 1 })
jsf.option({ maxItems: 3 })
jsf.option({ failOnInvalidTypes: false })
jsf.option({ failOnInvalidFormat: false })

function toFileSafe(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function pickSuccessStatus(responses: Record<string, any>): string | undefined {
  // Prefer 200, then 201, then first 2xx
  if (responses['200']) return '200'
  if (responses['201']) return '201'
  const twoXX = Object.keys(responses || {}).find((k) => /^2\d\d$/.test(k))
  return twoXX
}

function toPascalCase(input: string): string {
  const spaced = input.replace(/([0-9])([a-zA-Z])/g, '$1 $2')
  return spaced
    .split(/[^a-zA-Z0-9]+|\s+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
}

function opResponsesTypeName(method: string, rawPath: string): string {
  // Example: get + /api/v1beta/registry/{name}/servers/{serverName}
  // -> GetApiV1BetaRegistryByNameServersByServerNameResponses
  const segments = rawPath
    .replace(/^\//, '')
    .split('/')
    .map((seg) => {
      const m = seg.match(/^\{(.+)\}$/)
      if (m) return `By${toPascalCase(m[1] as string)}`
      return toPascalCase(seg)
    })
  const methodPart = toPascalCase(method)
  return `${methodPart}${segments.join('')}Responses`
}

function opResponseTypeName(method: string, rawPath: string): string {
  return opResponsesTypeName(method, rawPath).replace(/Responses$/, 'Response')
}

function getFixtureRelPath(safePath: string, method: string): string {
  return `./fixtures/${safePath}/${method}.${FIXTURE_EXT}`
}

function autoGenerateHandlers() {
  const result = []
  // Use a glob map so Vitest/Vite can track these files for watch/HMR.
  // Note: We don't use { import: 'default' } since fixtures now use named exports
  const fixtureImporters: Record<string, () => Promise<unknown>> =
    // @ts-ignore - vite-specific API available in vitest/vite runtime
    typeof import.meta.glob === 'function'
      ? import.meta.glob('./fixtures/**')
      : {}

  const specPaths = Object.entries(
    ((openapi as any).paths ?? {}) as Record<string, any>
  )

  const httpMethods = ['get', 'post', 'put', 'patch', 'delete'] as const

  for (const [rawPath, pathItem] of specPaths) {
    for (const method of httpMethods) {
      const operation = pathItem?.[method]
      if (!operation) continue

      const mswPath = `*/${rawPath.replace(/^\//, '').replace(/\{([^}]+)\}/g, ':$1')}`

      result.push(
        http[method](mswPath, async (info) => {
          const successStatus = pickSuccessStatus(operation.responses || {})

          // Shorten noisy prefixes in fixture filenames.
          // Example: "/api/v1beta/workloads/{name}" -> "workloads_name"
          const safePath = toFileSafe(rawPath)
            .replace(/^api_v1beta_/, '')
            .replace(/_api_v1beta_/g, '_')
            .replace(/_api_v1beta$/, '')
            // Normalize underscores after replacements
            .replace(/__+/g, '_')
            .replace(/^_+|_+$/g, '')

          const fileBase = `${safePath}/${method}.${FIXTURE_EXT}`
          const fixtureFileName = `${FIXTURES_PATH}/${fileBase}`

          if (!fs.existsSync(path.dirname(fixtureFileName))) {
            fs.mkdirSync(path.dirname(fixtureFileName), { recursive: true })
          }
          const fileExists = fs.existsSync(fixtureFileName)
          if (!fileExists && successStatus !== '204') {
            // Generate fixtures for all statuses; for 204 use empty string
            let payload: any = {}
            if (successStatus) {
              const schema =
                operation.responses?.[successStatus]?.content?.[
                  'application/json'
                ]?.schema
              if (schema) {
                try {
                  const resolved = derefSchema(schema)
                  payload = jsf.generate(resolved)
                } catch (e) {
                  console.warn(
                    '[auto-mocker] jsf.generate failed for',
                    method.toUpperCase(),
                    rawPath,
                    e
                  )
                }
              } else {
                console.warn(
                  '[auto-mocker] no JSON schema for',
                  method.toUpperCase(),
                  rawPath,
                  'status',
                  successStatus
                )
              }
            }

            const opType = successStatus
              ? opResponseTypeName(method, rawPath)
              : undefined
            const tsModule = buildMockModule(payload, opType)
            fs.writeFileSync(fixtureFileName, tsModule)
            // After generating, rely on live import below so that
            // behavior matches pre-existing fixtures.
          }

          const relPath = getFixtureRelPath(safePath, method)
          const opType = successStatus
            ? opResponseTypeName(method, rawPath)
            : undefined
          const mockName = opType ? deriveMockName(opType) : 'mockedResponse'

          let fixture: AutoAPIMockInstance<unknown> | unknown
          try {
            const importer = fixtureImporters?.[relPath]
            if (importer) {
              const mod = (await importer()) as Record<string, unknown>
              // Try new format (named export) first, fall back to old format (default export)
              fixture = mod[mockName] ?? mod.default ?? mod
            } else {
              // Fall back to dynamic import for freshly generated files
              const mod = (await import(relPath)) as Record<string, unknown>
              fixture = mod[mockName] ?? mod.default ?? mod
            }
          } catch {
            // No fixture found - for 204 endpoints, return default 204 response
            if (successStatus === '204') {
              return new HttpResponse(null, { status: 204 })
            }
            return new HttpResponse(
              `[auto-mocker] Missing mock fixture: ${relPath}.`,
              { status: 500 }
            )
          }

          // Check if fixture is an AutoAPIMock instance (new format)
          if (
            fixture &&
            typeof (fixture as AutoAPIMockInstance<unknown>)
              .generatedHandler === 'function'
          ) {
            return (fixture as AutoAPIMockInstance<unknown>).generatedHandler(
              info
            )
          }

          // For 204 endpoints without AutoAPIMock fixture, return default 204
          if (successStatus === '204') {
            return new HttpResponse(null, { status: 204 })
          }

          // Old format: plain data object (backward compatibility)
          return HttpResponse.json(fixture, {
            status: successStatus ? Number(successStatus) : 200,
          })
        })
      )
    }
  }

  return result
}

// Very small $ref resolver for local pointers like '#/components/schemas/...'
function derefSchema<T = any>(schema: any, seen = new Set()): T {
  if (!schema || typeof schema !== 'object') return schema
  if (schema.$ref && typeof schema.$ref === 'string') {
    const target = resolvePointer(schema.$ref)
    // Prevent cycles
    if (seen.has(target)) return target as T
    seen.add(target)
    return derefSchema(target, seen)
  }
  if (Array.isArray(schema)) {
    return schema.map((item) => derefSchema(item, seen)) as any
  }
  const out: any = {}
  for (const [k, v] of Object.entries(schema)) {
    out[k] = derefSchema(v, seen)
  }
  return out as T
}

function resolvePointer(ref: string): any {
  if (!ref.startsWith('#/')) return {}
  const parts = ref
    .slice(2)
    .split('/')
    .map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'))
  let cur: any = openapi as any
  for (const part of parts) {
    cur = cur?.[part]
    if (cur === undefined) return {}
  }
  return cur
}

export const autoGeneratedHandlers = autoGenerateHandlers()
