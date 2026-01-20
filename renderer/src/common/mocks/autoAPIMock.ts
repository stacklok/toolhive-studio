import type { HttpResponseResolver, JsonBodyType } from 'msw'
import { HttpResponse } from 'msw'
import type { MockScenarioName } from './scenarioNames'

const SCENARIO_HEADER = 'x-mock-scenario'

type ResponseResolverInfo = Parameters<HttpResponseResolver>[0]

type OverrideHandlerFn<T> = (data: T, info: ResponseResolverInfo) => Response
type OverrideFn<T> = (data: T, info: ResponseResolverInfo) => T
type ScenarioFn<T> = (
  instance: AutoAPIMockInstance<T>
) => AutoAPIMockInstance<T>

export interface ActivateScenarioOptions {
  /** If true, silently falls back to default when scenario doesn't exist. Default: false (throws) */
  fallbackToDefault?: boolean
}

export interface AutoAPIMockInstance<T> {
  /** MSW handler to use in handler registration. Respects overrides and scenarios. */
  generatedHandler: HttpResponseResolver

  /** Override response data with type safety. Preferred for simple data changes. */
  override: (fn: OverrideFn<T>) => AutoAPIMockInstance<T>

  /** Override the full handler. Use for errors, network failures, or invalid data. */
  overrideHandler: (fn: OverrideHandlerFn<T>) => AutoAPIMockInstance<T>

  /** Conditionally override response data based on request details. */
  conditionalOverride: (
    predicate: (info: ResponseResolverInfo) => boolean,
    fn: OverrideFn<T>
  ) => AutoAPIMockInstance<T>

  /** Define a reusable named scenario for this mock. */
  scenario: (
    name: MockScenarioName,
    fn: ScenarioFn<T>
  ) => AutoAPIMockInstance<T>

  /** Activate a named scenario for the current test. */
  activateScenario: (
    name: MockScenarioName,
    options?: ActivateScenarioOptions
  ) => AutoAPIMockInstance<T>

  /** Reset to default behavior. Called automatically before each test. */
  reset: () => AutoAPIMockInstance<T>

  /** The default fixture data. */
  defaultValue: T
}

// Registry to track all instances for bulk reset
const registry: Set<AutoAPIMockInstance<unknown>> = new Set()

export function AutoAPIMock<T>(defaultValue: T): AutoAPIMockInstance<T> {
  let overrideHandlerFn: OverrideHandlerFn<T> | null = null
  const scenarios = new Map<MockScenarioName, ScenarioFn<T>>()

  const instance: AutoAPIMockInstance<T> = {
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

    override(fn: OverrideFn<T>) {
      return instance.overrideHandler((data, info) =>
        HttpResponse.json(fn(data, info) as JsonBodyType)
      )
    },

    overrideHandler(fn: OverrideHandlerFn<T>) {
      overrideHandlerFn = fn
      return instance
    },

    conditionalOverride(
      predicate: (info: ResponseResolverInfo) => boolean,
      fn: OverrideFn<T>
    ) {
      const previousHandler = overrideHandlerFn
      overrideHandlerFn = (data, info) => {
        if (predicate(info)) {
          return HttpResponse.json(fn(data, info) as JsonBodyType)
        }
        if (previousHandler) {
          return previousHandler(data, info)
        }
        return HttpResponse.json(data as JsonBodyType)
      }
      return instance
    },

    scenario(name: MockScenarioName, fn: ScenarioFn<T>) {
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

  registry.add(instance as AutoAPIMockInstance<unknown>)

  return instance
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
