import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { WebContents } from 'electron'

const mockUpdateThreadMessages = vi.hoisted(() =>
  vi.fn(() => ({ success: true }))
)

vi.mock('../threads-storage', () => ({
  updateThreadMessages: mockUpdateThreadMessages,
}))

vi.mock('../../logger', () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('electron', () => ({
  app: { once: vi.fn() },
}))

import {
  _resetActiveStreamsForTests,
  cancelStream,
  getActiveStreamId,
  runManagedStream,
  setToolUiMetadata,
  subscribeToStream,
  unsubscribeFromStream,
} from '../active-streams'
import type { ChatUIMessage } from '../types'

interface FakeSender {
  send: ReturnType<typeof vi.fn>
  isDestroyed: () => boolean
}

function makeSender(): FakeSender {
  return {
    send: vi.fn(),
    isDestroyed: () => false,
  }
}

function asWebContents(sender: FakeSender): WebContents {
  return sender as unknown as WebContents
}

/** Drain pending microtasks so the for-await loop in runManagedStream can
 * pick up enqueued chunks. */
async function flushMicrotasks(times = 20) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve()
  }
}

function createControllableStream<T>() {
  let controller!: ReadableStreamDefaultController<T>
  const stream = new ReadableStream<T>({
    start(c) {
      controller = c
    },
  })
  return { stream, controller }
}

const initialUserMessages: ChatUIMessage[] = [
  {
    id: 'user-1',
    role: 'user',
    parts: [{ type: 'text', text: 'Hi' }],
  },
]

beforeEach(() => {
  vi.useFakeTimers()
  _resetActiveStreamsForTests()
  mockUpdateThreadMessages.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('active-streams registry', () => {
  it('broadcasts chunks to the originating subscriber and end on completion', async () => {
    const sender = makeSender()
    const { stream, controller } = createControllableStream<unknown>()

    const run = runManagedStream({
      chatId: 'thread-1',
      streamId: 'stream-1',
      originalMessages: initialUserMessages,
      uiMessageStream: stream as never,
      abortController: new AbortController(),
      initialSender: asWebContents(sender),
    })

    expect(getActiveStreamId('thread-1')).toBe('stream-1')

    controller.enqueue({
      type: 'start',
      messageId: 'asst-1',
    })
    await flushMicrotasks()
    controller.close()
    await run

    expect(getActiveStreamId('thread-1')).toBeNull()

    const channels = sender.send.mock.calls.map(
      (args: unknown[]) => args[0] as string
    )
    expect(channels).toContain('chat:stream:chunk')
    expect(channels).toContain('chat:stream:end')
  })

  it('exposes buffered chunks to a late subscriber via subscribeToStream', async () => {
    const initialSender = makeSender()
    const { stream, controller } = createControllableStream<unknown>()

    const run = runManagedStream({
      chatId: 'thread-2',
      streamId: 'stream-2',
      originalMessages: initialUserMessages,
      uiMessageStream: stream as never,
      abortController: new AbortController(),
      initialSender: asWebContents(initialSender),
    })

    controller.enqueue({ type: 'start', messageId: 'asst-1' })
    controller.enqueue({ type: 'text-start', id: 't1' })
    controller.enqueue({ type: 'text-delta', id: 't1', delta: 'Hel' })
    await flushMicrotasks()

    const lateSender = makeSender()
    const resumed = subscribeToStream('thread-2', asWebContents(lateSender))
    expect(resumed).not.toBeNull()
    expect(resumed!.streamId).toBe('stream-2')
    expect(resumed!.bufferedChunks.length).toBe(3)

    controller.enqueue({ type: 'text-delta', id: 't1', delta: 'lo' })
    await flushMicrotasks()

    const lateChunks = lateSender.send.mock.calls.filter(
      (args: unknown[]) => (args[0] as string) === 'chat:stream:chunk'
    )
    expect(lateChunks.length).toBe(1)
    expect(
      (lateChunks[0]![1] as { chunk: { delta: string } }).chunk.delta
    ).toBe('lo')

    controller.close()
    await run
  })

  it('returns null when subscribing to an unknown thread', () => {
    const sender = makeSender()
    expect(subscribeToStream('missing', asWebContents(sender))).toBeNull()
  })

  it('unsubscribeFromStream stops further chunks reaching that sender', async () => {
    const sender = makeSender()
    const { stream, controller } = createControllableStream<unknown>()

    const run = runManagedStream({
      chatId: 'thread-3',
      streamId: 'stream-3',
      originalMessages: initialUserMessages,
      uiMessageStream: stream as never,
      abortController: new AbortController(),
      initialSender: asWebContents(sender),
    })

    controller.enqueue({ type: 'start', messageId: 'asst-1' })
    await flushMicrotasks()

    unsubscribeFromStream('thread-3', asWebContents(sender))
    sender.send.mockClear()

    controller.enqueue({ type: 'text-start', id: 't1' })
    await flushMicrotasks()
    expect(sender.send).not.toHaveBeenCalled()

    controller.close()
    await run
  })

  it('flushes a snapshot to disk after the throttle window during streaming', async () => {
    const sender = makeSender()
    const { stream, controller } = createControllableStream<unknown>()

    const run = runManagedStream({
      chatId: 'thread-4',
      streamId: 'stream-4',
      originalMessages: initialUserMessages,
      uiMessageStream: stream as never,
      abortController: new AbortController(),
      initialSender: asWebContents(sender),
    })

    controller.enqueue({ type: 'start', messageId: 'asst-1' })
    controller.enqueue({ type: 'text-start', id: 't1' })
    controller.enqueue({ type: 'text-delta', id: 't1', delta: 'partial' })
    await flushMicrotasks()

    expect(mockUpdateThreadMessages).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(300)
    expect(mockUpdateThreadMessages).toHaveBeenCalled()

    controller.close()
    await run
  })

  it('force-flushes the final snapshot at finish', async () => {
    const sender = makeSender()
    const { stream, controller } = createControllableStream<unknown>()

    const run = runManagedStream({
      chatId: 'thread-5',
      streamId: 'stream-5',
      originalMessages: initialUserMessages,
      uiMessageStream: stream as never,
      abortController: new AbortController(),
      initialSender: asWebContents(sender),
    })

    controller.enqueue({ type: 'start', messageId: 'asst-1' })
    controller.enqueue({ type: 'text-start', id: 't1' })
    controller.enqueue({ type: 'text-delta', id: 't1', delta: 'final' })
    controller.enqueue({ type: 'text-end', id: 't1' })
    controller.enqueue({ type: 'finish' })
    controller.close()

    await run

    expect(mockUpdateThreadMessages).toHaveBeenCalled()
    const lastCall = mockUpdateThreadMessages.mock.calls.at(-1) as
      | unknown[]
      | undefined
    expect(lastCall?.[0]).toBe('thread-5')
  })

  it('cancelStream aborts the underlying controller', async () => {
    const sender = makeSender()
    const { stream } = createControllableStream<unknown>()
    const abortController = new AbortController()

    runManagedStream({
      chatId: 'thread-6',
      streamId: 'stream-6',
      originalMessages: initialUserMessages,
      uiMessageStream: stream as never,
      abortController,
      initialSender: asWebContents(sender),
    })

    expect(cancelStream('thread-6')).toBe(true)
    expect(abortController.signal.aborted).toBe(true)
    expect(cancelStream('missing')).toBe(false)
  })

  it('setToolUiMetadata broadcasts to subscribers and is replayed on subscribe', async () => {
    const sender = makeSender()
    const { stream, controller } = createControllableStream<unknown>()

    const run = runManagedStream({
      chatId: 'thread-7',
      streamId: 'stream-7',
      originalMessages: initialUserMessages,
      uiMessageStream: stream as never,
      abortController: new AbortController(),
      initialSender: asWebContents(sender),
    })

    setToolUiMetadata('thread-7', { 'tool.foo': { resourceUri: 'x' } })

    const lateSender = makeSender()
    const resumed = subscribeToStream('thread-7', asWebContents(lateSender))
    expect(resumed?.toolUiMetadata).toEqual({
      'tool.foo': { resourceUri: 'x' },
    })

    expect(
      sender.send.mock.calls.some(
        (args: unknown[]) => args[0] === 'chat:stream:tool-ui-metadata'
      )
    ).toBe(true)

    controller.close()
    await run
  })
})
