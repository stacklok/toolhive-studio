import type json from "../common/api/openapi.json";

/**
 * OpenAPI spec uses curly braces to denote path parameters
 * @example
 * ```
 * /api/v1/provider-endpoints/{provider_id}/models
 * ```
 *
 * MSW expects a colon prefix for path parameters
 * @example
 * ```
 * /api/v1/provider-endpoints/:provider_id/models
 * ```
 */
type ReplacePathParams<T extends string> =
  T extends `${infer Start}{${infer Param}}${infer End}`
    ? `${Start}:${Param}${ReplacePathParams<End>}`
    : T;

type Endpoint = ReplacePathParams<keyof typeof json.paths>;

export function mswEndpoint(endpoint: Endpoint) {
  return new URL(endpoint, import.meta.env.VITE_BASE_API_URL).toString();
}
