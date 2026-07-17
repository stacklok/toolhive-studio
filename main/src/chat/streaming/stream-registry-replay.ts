import type {
  ActiveStream,
  ChatUIMessageChunk,
  ReasoningPartReplay,
  TextPartReplay,
  ToolPartReplay,
} from './stream-registry-types'

/**
 * Update the structural replay state from a single live chunk.
 *
 * The point of this state is to let `buildReplayChunks` synthesize a
 * minimal, deterministic chunk sequence that drops a late subscriber's
 * AI SDK assembler into the same `runningMessage` as the live tail —
 * without replaying every original delta. We only track what the AI
 * SDK's `processUIMessageStream` actually consumes to grow message
 * parts; ephemeral chunks (`start-step`, `finish-step`, metadata,
 * `finish`, `error`) are intentionally ignored — they'll arrive on the
 * live tail as the upstream produces them.
 */
export function recordChunkForReplay(
  stream: ActiveStream,
  chunk: ChatUIMessageChunk
): void {
  switch (chunk.type) {
    case 'start': {
      if (chunk.messageId) stream.messageId = chunk.messageId
      return
    }
    case 'text-start': {
      if (!stream.textParts.has(chunk.id)) {
        stream.textParts.set(chunk.id, {
          text: '',
          done: false,
          providerMetadata: chunk.providerMetadata,
        })
        stream.blockOrder.push({ kind: 'text', id: chunk.id })
      }
      return
    }
    case 'text-delta': {
      const part = stream.textParts.get(chunk.id)
      if (part) part.text += chunk.delta
      return
    }
    case 'text-end': {
      const part = stream.textParts.get(chunk.id)
      if (part) {
        part.done = true
        if (chunk.providerMetadata)
          part.providerMetadata = chunk.providerMetadata
      }
      return
    }
    case 'reasoning-start': {
      if (!stream.reasoningParts.has(chunk.id)) {
        stream.reasoningParts.set(chunk.id, {
          text: '',
          done: false,
          providerMetadata: chunk.providerMetadata,
        })
        stream.blockOrder.push({ kind: 'reasoning', id: chunk.id })
      }
      return
    }
    case 'reasoning-delta': {
      const part = stream.reasoningParts.get(chunk.id)
      if (part) part.text += chunk.delta
      return
    }
    case 'reasoning-end': {
      const part = stream.reasoningParts.get(chunk.id)
      if (part) {
        part.done = true
        if (chunk.providerMetadata)
          part.providerMetadata = chunk.providerMetadata
      }
      return
    }
    case 'tool-input-start': {
      if (!stream.toolParts.has(chunk.toolCallId)) {
        stream.toolParts.set(chunk.toolCallId, {
          toolName: chunk.toolName,
          dynamic: chunk.dynamic,
          providerExecuted: chunk.providerExecuted,
          title: chunk.title,
          partialInputText: '',
          input: undefined,
          rawInput: undefined,
          output: undefined,
          errorText: undefined,
          preliminary: undefined,
          callProviderMetadata: chunk.providerMetadata,
          state: 'input-streaming',
        })
        stream.blockOrder.push({ kind: 'tool', toolCallId: chunk.toolCallId })
      }
      return
    }
    case 'tool-input-delta': {
      const part = stream.toolParts.get(chunk.toolCallId)
      if (part) part.partialInputText += chunk.inputTextDelta
      return
    }
    case 'tool-input-available': {
      const part = stream.toolParts.get(chunk.toolCallId)
      if (part) {
        part.toolName = chunk.toolName
        part.input = chunk.input
        part.dynamic = chunk.dynamic ?? part.dynamic
        part.providerExecuted = chunk.providerExecuted ?? part.providerExecuted
        part.title = chunk.title ?? part.title
        if (chunk.providerMetadata) {
          part.callProviderMetadata = chunk.providerMetadata
        }
        part.state = 'input-available'
      }
      return
    }
    case 'tool-input-error': {
      const part = stream.toolParts.get(chunk.toolCallId)
      if (part) {
        part.toolName = chunk.toolName
        part.rawInput = chunk.input
        part.errorText = chunk.errorText
        part.dynamic = chunk.dynamic ?? part.dynamic
        part.providerExecuted = chunk.providerExecuted ?? part.providerExecuted
        part.title = chunk.title ?? part.title
        if (chunk.providerMetadata) {
          part.callProviderMetadata = chunk.providerMetadata
        }
        part.state = 'output-error'
      }
      return
    }
    case 'tool-output-available': {
      const part = stream.toolParts.get(chunk.toolCallId)
      if (part) {
        part.output = chunk.output
        part.preliminary = chunk.preliminary
        part.providerExecuted = chunk.providerExecuted ?? part.providerExecuted
        if (chunk.providerMetadata) {
          part.resultProviderMetadata = chunk.providerMetadata
        }
        part.state = 'output-available'
      }
      return
    }
    case 'tool-output-error': {
      const part = stream.toolParts.get(chunk.toolCallId)
      if (part) {
        part.errorText = chunk.errorText
        part.providerExecuted = chunk.providerExecuted ?? part.providerExecuted
        if (chunk.providerMetadata) {
          part.resultProviderMetadata = chunk.providerMetadata
        }
        part.state = 'output-error'
      }
      return
    }
    default:
      // start-step / finish-step / message-metadata / finish / error /
      // tool-approval-request / tool-output-denied / data-* / file /
      // source-* — ignored for replay; live tail provides them.
      return
  }
}

function emitTextReplay(
  out: ChatUIMessageChunk[],
  id: string,
  part: TextPartReplay
): void {
  out.push({
    type: 'text-start',
    id,
    providerMetadata: part.providerMetadata,
  } as ChatUIMessageChunk)
  if (part.text.length > 0) {
    out.push({
      type: 'text-delta',
      id,
      delta: part.text,
    } as ChatUIMessageChunk)
  }
  if (part.done) {
    out.push({
      type: 'text-end',
      id,
      providerMetadata: part.providerMetadata,
    } as ChatUIMessageChunk)
  }
}

function emitReasoningReplay(
  out: ChatUIMessageChunk[],
  id: string,
  part: ReasoningPartReplay
): void {
  out.push({
    type: 'reasoning-start',
    id,
    providerMetadata: part.providerMetadata,
  } as ChatUIMessageChunk)
  if (part.text.length > 0) {
    out.push({
      type: 'reasoning-delta',
      id,
      delta: part.text,
    } as ChatUIMessageChunk)
  }
  if (part.done) {
    out.push({
      type: 'reasoning-end',
      id,
      providerMetadata: part.providerMetadata,
    } as ChatUIMessageChunk)
  }
}

function emitToolReplay(
  out: ChatUIMessageChunk[],
  toolCallId: string,
  part: ToolPartReplay
): void {
  out.push({
    type: 'tool-input-start',
    toolCallId,
    toolName: part.toolName,
    dynamic: part.dynamic,
    providerExecuted: part.providerExecuted,
    title: part.title,
    providerMetadata: part.callProviderMetadata,
  } as ChatUIMessageChunk)

  // Replay the partial input text only while the tool is still
  // streaming its arguments. After `tool-input-available` the SDK
  // ignores `partialToolCalls[id]` and reads `input` directly, so
  // there's no point shipping the deltas.
  if (part.state === 'input-streaming' && part.partialInputText.length > 0) {
    out.push({
      type: 'tool-input-delta',
      toolCallId,
      inputTextDelta: part.partialInputText,
    } as ChatUIMessageChunk)
  }

  if (part.state !== 'input-streaming') {
    if (part.input !== undefined) {
      out.push({
        type: 'tool-input-available',
        toolCallId,
        toolName: part.toolName,
        input: part.input,
        dynamic: part.dynamic,
        providerExecuted: part.providerExecuted,
        providerMetadata: part.callProviderMetadata,
        title: part.title,
      } as ChatUIMessageChunk)
    }
  }

  if (part.state === 'output-available') {
    out.push({
      type: 'tool-output-available',
      toolCallId,
      output: part.output,
      providerExecuted: part.providerExecuted,
      preliminary: part.preliminary,
      providerMetadata: part.resultProviderMetadata,
      dynamic: part.dynamic,
    } as ChatUIMessageChunk)
  } else if (part.state === 'output-error' && part.errorText !== undefined) {
    out.push({
      type: 'tool-output-error',
      toolCallId,
      errorText: part.errorText,
      providerExecuted: part.providerExecuted,
      providerMetadata: part.resultProviderMetadata,
      dynamic: part.dynamic,
    } as ChatUIMessageChunk)
  }
}

/**
 * Synthesize a replay chunk sequence that drops a late subscriber's
 * `processUIMessageStream` instance into the same `runningMessage` the
 * live tail is producing. We compress every original delta into one
 * consolidated delta per block, which is correct because the SDK only
 * cares that `activeTextParts[id]` exists when a delta lands — it
 * doesn't validate granularity.
 */
export function buildReplayChunks(stream: ActiveStream): ChatUIMessageChunk[] {
  if (!stream.messageId) return []
  const out: ChatUIMessageChunk[] = [
    { type: 'start', messageId: stream.messageId } as ChatUIMessageChunk,
  ]
  for (const ref of stream.blockOrder) {
    if (ref.kind === 'text') {
      const part = stream.textParts.get(ref.id)
      if (part) emitTextReplay(out, ref.id, part)
    } else if (ref.kind === 'reasoning') {
      const part = stream.reasoningParts.get(ref.id)
      if (part) emitReasoningReplay(out, ref.id, part)
    } else {
      const part = stream.toolParts.get(ref.toolCallId)
      if (part) emitToolReplay(out, ref.toolCallId, part)
    }
  }
  return out
}
