import '../runtime/__tests__/setup'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { WebContents } from 'electron'
import { installChatTestRuntimeHooks } from '../runtime/test-runtime'

const mockWriteThread = vi.hoisted(() => vi.fn())
const mockReadThread = vi.hoisted(() =>
  vi.fn((id: string) => ({
    id,
    messages: [],
    lastEditTimestamp: 0,
    createdAt: 0,
  }))
)

vi.mock('../../db/writers/threads-writer', () => ({
  writeThread: mockWriteThread,
  deleteThreadFromDb: vi.fn(),
  clearAllThreadsFromDb: vi.fn(),
  writeActiveThread: vi.fn(),
  writeThreadSelectedModel: vi.fn(),
  writeThreadEnabledMcpTools: vi.fn(),
  writeThreadEnabledSkills: vi.fn(),
}))

vi.mock('../../db/readers/threads-reader', () => ({
  readThread: mockReadThread,
  readAllThreads: vi.fn(() => []),
  readActiveThreadId: vi.fn(),
  readThreadCount: vi.fn(() => 0),
  readThreadSelectedModel: vi.fn(() => null),
  readThreadEnabledMcpTools: vi.fn(() => ({})),
  readThreadEnabledSkills: vi.fn(() => []),
}))

vi.mock('../../db/readers/agents-reader', () => ({
  readThreadAgentId: vi.fn(() => null),
  readAgent: vi.fn(),
  readAllAgents: vi.fn(() => []),
}))

vi.mock('../../logger', () => ({
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('electron-store', () => ({
  default: class FakeStore {},
}))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp'),
    on: vi.fn(),
    once: vi.fn(),
  },
  webContents: {
    getAllWebContents: vi.fn(() => []),
  },
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
import { shutdownAllActiveStreams } from '../streaming/stream-registry-service'
import type { ChatUIMessage } from '../types'

installChatTestRuntimeHooks()

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

/** Drain microtasks so `runManagedStream`'s for-await loop picks up
 * chunks. ~20 hops covers the `tee()` + assembler + broadcast pipeline. */
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
  mockWriteThread.mockReset()
  mockReadThread.mockReset()
  mockReadThread.mockImplementation((id: string) => ({
    id,
    messages: [],
    lastEditTimestamp: 0,
    createdAt: 0,
  }))
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

  it('synthesizes a replay for a late subscriber and forwards live chunks afterwards', async () => {
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
    controller.enqueue({ type: 'text-delta', id: 't1', delta: 'lo' })
    await flushMicrotasks()

    const lateSender = makeSender()
    const resumed = subscribeToStream('thread-2', asWebContents(lateSender))
    expect(resumed).not.toBeNull()
    expect(resumed!.streamId).toBe('stream-2')

    // Replay must be a deterministic, consolidated sequence — the four
    // original deltas collapse to one synthesized delta carrying "Hello".
    expect(resumed!.replayChunks).toEqual([
      { type: 'start', messageId: 'asst-1' },
      { type: 'text-start', id: 't1', providerMetadata: undefined },
      { type: 'text-delta', id: 't1', delta: 'Hello' },
    ])

    controller.enqueue({ type: 'text-delta', id: 't1', delta: '!' })
    await flushMicrotasks()

    const lateChunks = lateSender.send.mock.calls.filter(
      (args: unknown[]) => (args[0] as string) === 'chat:stream:chunk'
    )
    expect(lateChunks.length).toBe(1)
    expect(
      (lateChunks[0]![1] as { chunk: { delta: string } }).chunk.delta
    ).toBe('!')

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

    expect(mockWriteThread).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(300)
    expect(mockWriteThread).toHaveBeenCalled()

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

    expect(mockWriteThread).toHaveBeenCalled()
    const lastCall = mockWriteThread.mock.calls.at(-1) as
      [{ id?: string }] | undefined
    expect(lastCall?.[0]?.id).toBe('thread-5')
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

  it('rejects a second stream for the same chatId while one is still running', async () => {
    const sender = makeSender()
    const { stream: streamA, controller: controllerA } =
      createControllableStream<unknown>()
    const { stream: streamB } = createControllableStream<unknown>()

    const runA = runManagedStream({
      chatId: 'thread-dup',
      streamId: 'stream-a',
      originalMessages: initialUserMessages,
      uiMessageStream: streamA as never,
      abortController: new AbortController(),
      initialSender: asWebContents(sender),
    })

    expect(getActiveStreamId('thread-dup')).toBe('stream-a')

    await expect(
      runManagedStream({
        chatId: 'thread-dup',
        streamId: 'stream-b',
        originalMessages: initialUserMessages,
        uiMessageStream: streamB as never,
        abortController: new AbortController(),
        initialSender: asWebContents(sender),
      })
    ).rejects.toThrow(/already active/i)

    // Original stream is unaffected.
    expect(getActiveStreamId('thread-dup')).toBe('stream-a')

    controllerA.close()
    await runA
  })

  it('broadcasts chat:stream:persist-error once when the snapshot write fails', async () => {
    mockWriteThread.mockImplementation(() => {
      throw new Error('disk full')
    })

    const sender = makeSender()
    const { stream, controller } = createControllableStream<unknown>()

    const run = runManagedStream({
      chatId: 'thread-persist',
      streamId: 'stream-persist',
      originalMessages: initialUserMessages,
      uiMessageStream: stream as never,
      abortController: new AbortController(),
      initialSender: asWebContents(sender),
    })

    controller.enqueue({ type: 'start', messageId: 'asst-1' })
    controller.enqueue({ type: 'text-start', id: 't1' })
    controller.enqueue({ type: 'text-delta', id: 't1', delta: 'partial' })
    await flushMicrotasks()
    await vi.advanceTimersByTimeAsync(300)

    controller.enqueue({ type: 'text-delta', id: 't1', delta: 'more' })
    await flushMicrotasks()
    await vi.advanceTimersByTimeAsync(300)

    controller.close()
    await run

    const persistErrors = sender.send.mock.calls.filter(
      (args: unknown[]) => args[0] === 'chat:stream:persist-error'
    )
    expect(persistErrors).toHaveLength(1)
    expect(
      (persistErrors[0]![1] as { chatId: string; error: string }).chatId
    ).toBe('thread-persist')
    expect((persistErrors[0]![1] as { error: string }).error).toContain(
      'disk full'
    )
  })

  it('returns an empty replay when no chunks have arrived yet', async () => {
    const sender = makeSender()
    const { stream, controller } = createControllableStream<unknown>()

    const run = runManagedStream({
      chatId: 'thread-empty',
      streamId: 'stream-empty',
      originalMessages: initialUserMessages,
      uiMessageStream: stream as never,
      abortController: new AbortController(),
      initialSender: asWebContents(sender),
    })

    // Subscribe before any chunk has been pumped: replay must be empty
    // (no `messageId` known yet) so the late subscriber simply waits
    // for the live tail.
    const lateSender = makeSender()
    const resumed = subscribeToStream('thread-empty', asWebContents(lateSender))
    expect(resumed).not.toBeNull()
    expect(resumed!.replayChunks).toEqual([])

    controller.close()
    await run
  })

  it('replays a completed text part with start/delta/end', async () => {
    const sender = makeSender()
    const { stream, controller } = createControllableStream<unknown>()

    const run = runManagedStream({
      chatId: 'thread-text-done',
      streamId: 'stream-text-done',
      originalMessages: initialUserMessages,
      uiMessageStream: stream as never,
      abortController: new AbortController(),
      initialSender: asWebContents(sender),
    })

    controller.enqueue({ type: 'start', messageId: 'asst-1' })
    controller.enqueue({ type: 'text-start', id: 't1' })
    controller.enqueue({ type: 'text-delta', id: 't1', delta: 'Done' })
    controller.enqueue({ type: 'text-end', id: 't1' })
    await flushMicrotasks()

    const lateSender = makeSender()
    const resumed = subscribeToStream(
      'thread-text-done',
      asWebContents(lateSender)
    )
    expect(resumed!.replayChunks).toEqual([
      { type: 'start', messageId: 'asst-1' },
      { type: 'text-start', id: 't1', providerMetadata: undefined },
      { type: 'text-delta', id: 't1', delta: 'Done' },
      { type: 'text-end', id: 't1', providerMetadata: undefined },
    ])

    controller.close()
    await run
  })

  it('replays mixed text + tool with output in blockOrder', async () => {
    const sender = makeSender()
    const { stream, controller } = createControllableStream<unknown>()

    const run = runManagedStream({
      chatId: 'thread-mixed',
      streamId: 'stream-mixed',
      originalMessages: initialUserMessages,
      uiMessageStream: stream as never,
      abortController: new AbortController(),
      initialSender: asWebContents(sender),
    })

    controller.enqueue({ type: 'start', messageId: 'asst-1' })
    controller.enqueue({ type: 'text-start', id: 't1' })
    controller.enqueue({ type: 'text-delta', id: 't1', delta: 'Calling…' })
    controller.enqueue({ type: 'text-end', id: 't1' })
    controller.enqueue({
      type: 'tool-input-start',
      toolCallId: 'tc1',
      toolName: 'search',
    })
    controller.enqueue({
      type: 'tool-input-available',
      toolCallId: 'tc1',
      toolName: 'search',
      input: { q: 'cats' },
    })
    controller.enqueue({
      type: 'tool-output-available',
      toolCallId: 'tc1',
      output: { hits: 42 },
    })
    await flushMicrotasks()

    const lateSender = makeSender()
    const resumed = subscribeToStream('thread-mixed', asWebContents(lateSender))

    // Order matches blockOrder: text first, then tool. The tool replay
    // skips `tool-input-delta` because state already advanced past
    // `input-streaming`.
    expect(resumed!.replayChunks).toEqual([
      { type: 'start', messageId: 'asst-1' },
      { type: 'text-start', id: 't1', providerMetadata: undefined },
      { type: 'text-delta', id: 't1', delta: 'Calling…' },
      { type: 'text-end', id: 't1', providerMetadata: undefined },
      {
        type: 'tool-input-start',
        toolCallId: 'tc1',
        toolName: 'search',
        dynamic: undefined,
        providerExecuted: undefined,
        title: undefined,
        providerMetadata: undefined,
      },
      {
        type: 'tool-input-available',
        toolCallId: 'tc1',
        toolName: 'search',
        input: { q: 'cats' },
        dynamic: undefined,
        providerExecuted: undefined,
        providerMetadata: undefined,
        title: undefined,
      },
      {
        type: 'tool-output-available',
        toolCallId: 'tc1',
        output: { hits: 42 },
        providerExecuted: undefined,
        preliminary: undefined,
        providerMetadata: undefined,
        dynamic: undefined,
      },
    ])

    controller.close()
    await run
  })

  it('replays a tool with partial input still streaming', async () => {
    const sender = makeSender()
    const { stream, controller } = createControllableStream<unknown>()

    const run = runManagedStream({
      chatId: 'thread-tool-partial',
      streamId: 'stream-tool-partial',
      originalMessages: initialUserMessages,
      uiMessageStream: stream as never,
      abortController: new AbortController(),
      initialSender: asWebContents(sender),
    })

    controller.enqueue({ type: 'start', messageId: 'asst-1' })
    controller.enqueue({
      type: 'tool-input-start',
      toolCallId: 'tc1',
      toolName: 'search',
    })
    controller.enqueue({
      type: 'tool-input-delta',
      toolCallId: 'tc1',
      inputTextDelta: '{"q":',
    })
    controller.enqueue({
      type: 'tool-input-delta',
      toolCallId: 'tc1',
      inputTextDelta: '"cats"}',
    })
    await flushMicrotasks()

    const lateSender = makeSender()
    const resumed = subscribeToStream(
      'thread-tool-partial',
      asWebContents(lateSender)
    )

    // The two original deltas collapse into one consolidated delta
    // carrying the full accumulated input text.
    expect(resumed!.replayChunks).toEqual([
      { type: 'start', messageId: 'asst-1' },
      {
        type: 'tool-input-start',
        toolCallId: 'tc1',
        toolName: 'search',
        dynamic: undefined,
        providerExecuted: undefined,
        title: undefined,
        providerMetadata: undefined,
      },
      {
        type: 'tool-input-delta',
        toolCallId: 'tc1',
        inputTextDelta: '{"q":"cats"}',
      },
    ])

    controller.close()
    await run
  })

  it('aborts every active stream on runtime shutdown', async () => {
    const sender = makeSender()
    const { stream: s1 } = createControllableStream<unknown>()
    const { stream: s2 } = createControllableStream<unknown>()
    const ac1 = new AbortController()
    const ac2 = new AbortController()

    runManagedStream({
      chatId: 'thread-q1',
      streamId: 'stream-q1',
      originalMessages: initialUserMessages,
      uiMessageStream: s1 as never,
      abortController: ac1,
      initialSender: asWebContents(sender),
    })
    runManagedStream({
      chatId: 'thread-q2',
      streamId: 'stream-q2',
      originalMessages: initialUserMessages,
      uiMessageStream: s2 as never,
      abortController: ac2,
      initialSender: asWebContents(sender),
    })

    shutdownAllActiveStreams()

    expect(ac1.signal.aborted).toBe(true)
    expect(ac2.signal.aborted).toBe(true)
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
