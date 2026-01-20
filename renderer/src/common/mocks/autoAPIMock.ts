import type { HttpResponseResolver, JsonBodyType } from 'msw'
import { HttpResponse } from 'msw'
import type { MockScenarioName } from './scenarioNames'

const SCENARIO_HEADER = 'x-mock-scenario'

type ResponseResolverInfo = Parameters<HttpResponseResolver>[0]

/** Generic parsed request info (used when TRequest is not provided) */
export interface ParsedRequestInfo {
  /** Query parameters as key-value pairs */
  query: Record<string, string | null>
  /** Path parameters (e.g., /groups/:name -> path.name) */
  path: Record<string, string | readonly string[] | undefined>
  /** Request body (parsed JSON) */
  body: unknown
  /** Request headers */
  headers: Headers
  /** Original request object */
  request: Request
}

/**
 * Extracts typed request info from API-generated request types.
 * Falls back to ParsedRequestInfo when TRequest is unknown.
 */
type TypedRequestInfo<TRequest> = unknown extends TRequest
  ? ParsedRequestInfo
  : {
      query: TRequest extends { query?: infer Q } ? Q : undefined
      path: TRequest extends { path?: infer P } ? P : undefined
      body: TRequest extends { body?: infer B } ? B : undefined
      headers: Headers
      request: Request
    }

type OverrideHandlerFn<T> = (
  data: T,
  info: ResponseResolverInfo
) => Response | Promise<Response>
type OverrideFn<T> = (data: T, info: ResponseResolverInfo) => T
type ScenarioFn<TResponse, TRequest> = (
  instance: AutoAPIMockInstance<TResponse, TRequest>
) => AutoAPIMockInstance<TResponse, TRequest>

export interface ActivateScenarioOptions {
  /** If true, silently falls back to default when scenario doesn't exist. Default: false (throws) */
  fallbackToDefault?: boolean
}

export interface AutoAPIMockInstance<TResponse, TRequest> {
  /** MSW handler to use in handler registration. Respects overrides and scenarios. */
  generatedHandler: HttpResponseResolver

  /** Override response data with type safety. Preferred for simple data changes. */
  override: (
    fn: OverrideFn<TResponse>
  ) => AutoAPIMockInstance<TResponse, TRequest>

  /** Override the full handler. Use for errors, network failures, or invalid data. */
  overrideHandler: (
    fn: OverrideHandlerFn<TResponse>
  ) => AutoAPIMockInstance<TResponse, TRequest>

  /** Conditionally override response data based on request details. */
  conditionalOverride: (
    predicate: (info: TypedRequestInfo<TRequest>) => boolean,
    fn: OverrideFn<TResponse>
  ) => AutoAPIMockInstance<TResponse, TRequest>

  /** Define a reusable named scenario for this mock. */
  scenario: (
    name: MockScenarioName,
    fn: ScenarioFn<TResponse, TRequest>
  ) => AutoAPIMockInstance<TResponse, TRequest>

  /** Activate a named scenario for the current test. */
  activateScenario: (
    name: MockScenarioName,
    options?: ActivateScenarioOptions
  ) => AutoAPIMockInstance<TResponse, TRequest>

  /** Reset to default behavior. Called automatically before each test. */
  reset: () => AutoAPIMockInstance<TResponse, TRequest>

  /** The default fixture data. */
  defaultValue: TResponse
}

// Registry to track all instances for bulk reset
const registry: Set<AutoAPIMockInstance<unknown, unknown>> = new Set()

// Force both type parameters to be explicitly provided
type RequireBothTypeParams<T, U> = [T, U] extends [infer R, infer Q]
  ? unknown extends Q
    ? 'Error: TRequest type parameter is required'
    : AutoAPIMockInstance<R, Q>
  : never

export function AutoAPIMock<TResponse, TRequest>(
  defaultValue: TResponse
): RequireBothTypeParams<TResponse, TRequest> {
  let overrideHandlerFn: OverrideHandlerFn<TResponse> | null = null
  const scenarios = new Map<MockScenarioName, ScenarioFn<TResponse, TRequest>>()

  const instance: AutoAPIMockInstance<TResponse, TRequest> = {
    defaultValue,

    generatedHandler(info: ResponseResolverInfo) {
      // Check for header-based scenario activation (for browser/dev testing)
      const headerScenario = info.request.headers.get(SCENARIO_HEADER)
      if (headerScenario) {
        const scenarioFn = scenarios.get(headerScenario as MockScenarioName)
        if (scenarioFn) {
          // Temporarily apply scenario and get the handler
          const previousHandler = overrideHandlerFn
          scenarioFn(instance)
          const result = overrideHandlerFn
            ? overrideHandlerFn(defaultValue, info)
            : HttpResponse.json(defaultValue as JsonBodyType)
          // Restore previous state
          overrideHandlerFn = previousHandler
          return result
        }
      }

      if (overrideHandlerFn) {
        return overrideHandlerFn(defaultValue, info)
      }
      return HttpResponse.json(defaultValue as JsonBodyType)
    },

    override(fn: OverrideFn<TResponse>) {
      return instance.overrideHandler((data, info) =>
        HttpResponse.json(fn(data, info) as JsonBodyType)
      )
    },

    overrideHandler(fn: OverrideHandlerFn<TResponse>) {
      overrideHandlerFn = fn
      return instance
    },

    conditionalOverride(
      predicate: (info: TypedRequestInfo<TRequest>) => boolean,
      fn: OverrideFn<TResponse>
    ) {
      const previousHandler = overrideHandlerFn
      overrideHandlerFn = async (data, info) => {
        // Parse request into a cleaner format
        const url = new URL(info.request.url)
        const query: Record<string, string | null> = {}
        url.searchParams.forEach((value, key) => {
          query[key] = value
        })

        // Parse body if present (clone request to allow re-reading)
        let body: unknown = undefined
        const contentType = info.request.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          try {
            body = await info.request.clone().json()
          } catch {
            // Body parsing failed, leave as undefined
          }
        }

        const parsed = {
          query,
          path: info.params,
          body,
          headers: info.request.headers,
          request: info.request,
        } as unknown as TypedRequestInfo<TRequest>

        if (predicate(parsed)) {
          return HttpResponse.json(fn(data, info) as JsonBodyType)
        }
        if (previousHandler) {
          return previousHandler(data, info)
        }
        return HttpResponse.json(data as JsonBodyType)
      }
      return instance
    },

    scenario(name: MockScenarioName, fn: ScenarioFn<TResponse, TRequest>) {
      scenarios.set(name, fn)
      return instance
    },

    activateScenario(
      name: MockScenarioName,
      options?: ActivateScenarioOptions
    ) {
      const scenarioFn = scenarios.get(name)
      if (!scenarioFn) {
        if (options?.fallbackToDefault) {
          return instance
        }
        throw new Error(
          `Scenario "${name}" not found. Available scenarios: ${[...scenarios.keys()].join(', ') || '(none)'}`
        )
      }
      return scenarioFn(instance)
    },

    reset() {
      overrideHandlerFn = null
      return instance
    },
  }

  registry.add(instance as AutoAPIMockInstance<unknown, unknown>)

  return instance as unknown as RequireBothTypeParams<TResponse, TRequest>
}

export function resetAllAutoAPIMocks(): void {
  for (const instance of registry) {
    instance.reset()
  }
}

/**
 * Activate a scenario globally across all registered mocks.
 * Mocks that don't have the scenario defined will silently use their default.
 */
export function activateMockScenario(name: MockScenarioName): void {
  for (const instance of registry) {
    instance.activateScenario(name, { fallbackToDefault: true })
  }
}
