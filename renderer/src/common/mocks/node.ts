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
  array.length === 1 ? array[0] : array

// eslint-disable-next-line @typescript-eslint/no-misused-promises
server.events.on('request:start', async ({ request }) => {
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
