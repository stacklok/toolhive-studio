// This file generates fallback mocks automatically to avoid
// having to create all mocks manually. You can still manually write
// mock handlers that override the behavior of these
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import openapi from '../../../../api/openapi.json'
import Ajv from 'ajv'
// import addFormats from 'ajv-formats'
import fs from 'fs'
import { JSONSchemaFaker as jsf } from 'json-schema-faker'
import { http, HttpResponse } from 'msw'
import path from 'path'
import { fileURLToPath } from 'url'
// import { mswEndpoint } from './customHandlers'

const ajv = new Ajv({ strict: true })

// ajv.addFormat('int64', { validate: () => true })
// addFormats(ajv)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FOLDER_PATH = __dirname
const FIXTURES_PATH = `${FOLDER_PATH}/fixtures`

// Make the generated data more usable without manual changes
jsf.option({ alwaysFakeOptionals: true })
jsf.option({ fillProperties: true })
jsf.option({ minItems: 1 })
jsf.option({ maxItems: 3 })
// be lenient with unknown formats
// @ts-ignore - option may not exist in types but supported at runtime
jsf.option({ failOnInvalidTypes: false })
// @ts-ignore
jsf.option({ failOnInvalidFormat: false })

// I think this is actually a bug in the schema
// jsf.format('int64', () => null)

// Do NOT run jsf on the entire OpenAPI document; it's not a JSON Schema.
// We only use jsf on per-operation response schemas inside handlers.

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

function autoGenerateHandlers() {
  const result = []
  const specPaths = Object.entries(((openapi as any).paths ?? {}) as Record<string, any>)

  try {
    const specVersion = (openapi as any).openapi || (openapi as any).swagger
    const specPathsPreview = Object.keys((openapi as any).paths || {}).slice(0, 5)
    console.log('[auto-mocker] OpenAPI version:', specVersion)
    console.log('[auto-mocker] Spec paths (preview):', specPathsPreview)
  } catch {}

  const httpMethods = ['get', 'post', 'put', 'patch', 'delete'] as const

  for (const [rawPath, pathItem] of specPaths) {
    for (const method of httpMethods) {
      const operation = pathItem?.[method]
      if (!operation) continue

      const mswPath = `*/${rawPath.replace(/^\//, '').replace(/\{([^}]+)\}/g, ':$1')}`

      try {
        console.log('[auto-mocker] registering', method.toUpperCase(), mswPath, 'from raw path', rawPath)
      } catch {}

      result.push(
        http[method](mswPath, () => {
          const successStatus = pickSuccessStatus(operation.responses || {})

          const fileBase = `${method}-${toFileSafe(rawPath)}.${successStatus ?? '200'}.json`
          const fixtureFileName = `${FIXTURES_PATH}/${fileBase}`

          console.log(`Handling ${method.toUpperCase()} '${mswPath}' using ${fixtureFileName}`)

          if (!fs.existsSync(fixtureFileName)) {
            let payload: any = {}
            if (successStatus && successStatus !== '204') {
              const schema = operation.responses?.[successStatus]?.content?.['application/json']?.schema
              if (schema) {
                try {
                  const resolved = derefSchema(schema)
                  payload = jsf.generate(resolved)
                } catch (e) {
                  console.warn('[auto-mocker] jsf.generate failed for', method.toUpperCase(), rawPath, e)
                }
              } else {
                console.warn('[auto-mocker] no JSON schema for', method.toUpperCase(), rawPath, 'status', successStatus)
              }
            }
            fs.writeFileSync(fixtureFileName, JSON.stringify(payload, null, 2))
          }

          if (successStatus === '204') {
            return new HttpResponse(null, { status: 204 })
          }

          const data = JSON.parse(fs.readFileSync(fixtureFileName, 'utf-8'))
          const schema = operation.responses?.[successStatus ?? '200']?.content?.['application/json']?.schema
          if (schema) {
            const resolved = derefSchema(schema)
            const isValid = ajv.validate(resolved, data)
            if (!isValid) {
              console.error('Invalid mock response', {
                fixtureFileName,
                errors: ajv.errors,
              })
              // fall through and still return the data to avoid undefined responses
            }
          }

          return HttpResponse.json(data, {
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
