// This file generates fallback mocks automatically to avoid
// having to create all mocks manually. You can still manually write
// mock handlers that override the behavior of these
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import openapi from '../../../../api/openapi.json'
import Ajv from 'ajv'
import fs from 'fs'
import { JSONSchemaFaker as jsf } from 'json-schema-faker'
import { http, HttpResponse } from 'msw'
import path from 'path'
import { fileURLToPath } from 'url'
// import { mswEndpoint } from './customHandlers'

const ajv = new Ajv({ strict: true })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FOLDER_PATH = __dirname
const FIXTURES_PATH = `${FOLDER_PATH}/fixtures`

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

function autoGenerateHandlers() {
  const result = []
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
        http[method](mswPath, () => {
          const successStatus = pickSuccessStatus(operation.responses || {})

          // Shorten noisy prefixes in fixture filenames.
          // Example: "/api/v1beta/workloads/{name}" -> "workloads_name"
          const safePath = toFileSafe(rawPath)
            // Remove leading OpenAPI prefix once sanitized
            .replace(/^api_v1beta_/, '')
            // Also remove occurrences when embedded
            .replace(/_api_v1beta_/g, '_')
            .replace(/_api_v1beta$/, '')
            // Normalize underscores after replacements
            .replace(/__+/g, '_')
            .replace(/^_+|_+$/g, '')

          const fileBase = `${method}-${safePath}.${successStatus ?? '200'}.json`
          const fixtureFileName = `${FIXTURES_PATH}/${fileBase}`

          // Avoid per-request "handling" logs in normal runs

          if (!fs.existsSync(fixtureFileName)) {
            let payload: any = {}
            if (successStatus && successStatus !== '204') {
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
            fs.writeFileSync(fixtureFileName, JSON.stringify(payload, null, 2))
          }

          if (successStatus === '204') {
            return new HttpResponse(null, { status: 204 })
          }

          const data = JSON.parse(fs.readFileSync(fixtureFileName, 'utf-8'))
          const schema =
            operation.responses?.[successStatus ?? '200']?.content?.[
              'application/json'
            ]?.schema
          if (schema) {
            const resolved = derefSchema(schema)
            const isValid = ajv.validate(resolved, data)
            if (!isValid) {
              console.error('Invalid mock response', {
                fixtureFileName,
                errors: ajv.errors,
              })
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
