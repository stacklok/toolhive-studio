import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { resetAllAutoAPIMocks } from './autoAPIMock'
import { server } from './node'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => resetAllAutoAPIMocks())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
