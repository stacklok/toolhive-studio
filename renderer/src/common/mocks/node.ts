import { setupServer } from 'msw/node'

import { handlers } from './handlers'

export const server = setupServer(...handlers)

// allows recording request to make test assertions for happy paths
const requestsRecorderState = {
  recordedRequests: [] as RecordedRequest[],
}

type RecordedRequest = {
  pathname: string
  method: string
  payload?: object
  search?: Record<string, string[] | string>
}

export const recordRequests = () => {
  requestsRecorderState.recordedRequests = []

  return requestsRecorderState
}

const arrayOrSingleString = (array: string[]): string[] | string =>
  array.length === 1 ? (array[0] as string) : array

server.events.on('request:start', async ({ request }) => {
  console.log('[msw] request:start', request.method, request.url)
  // record request details to help making assertions
  const url = new URL(request.url)
  const searchParams = new URLSearchParams(url.search)
  let payload
  try {
    const req = await request.clone().text()
    payload = req ? { payload: JSON.parse(req) } : {}
  } catch {
    return {}
  }

  requestsRecorderState.recordedRequests.push({
    pathname: decodeURIComponent(url.pathname),
    method: request.method,
    ...payload,
    ...(searchParams.size === 0
      ? {}
      : {
          search: Object.fromEntries(
            Array.from(searchParams.keys()).map((key) => [
              key,
              arrayOrSingleString(searchParams.getAll(key)),
            ])
          ),
        }),
  })
})

// Debug which handlers match to verify auto-generated vs custom usage
try {
  server.events.on('request:match', ({ request }) => {
    console.log('[msw] matched', request.method, request.url)
  })
  server.events.on('request:unhandled', ({ request }) => {
    console.warn('[msw] unhandled', request.method, request.url)
  })
} catch {
  // Ignore if MSW event API changes in the environment
}
