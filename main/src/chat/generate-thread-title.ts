import { generateText, convertToModelMessages } from 'ai'
import log from '../logger'
import { CHAT_PROVIDERS } from './providers'
import { createModelFromRequest } from './utils'
import { readSelectedModel } from '../db/readers/chat-settings-reader'
import { readChatProvider } from '../db/readers/chat-settings-reader'
import { LOCAL_PROVIDER_IDS } from './constants'
import { getThread, updateThread } from './threads-storage'

const TITLE_SYSTEM_PROMPT =
  'You are a concise assistant. Summarize the following conversation in 6 words or fewer using title case. Reply with only the title — no punctuation, no quotes, no explanation.'

function isLocalProvider(providerId: string): boolean {
  return LOCAL_PROVIDER_IDS.includes(
    providerId as (typeof LOCAL_PROVIDER_IDS)[number]
  )
}

export async function generateThreadTitle(
  threadId: string
): Promise<{ success: boolean; title?: string; error?: string }> {
  try {
    const thread = getThread(threadId)
    if (!thread) {
      return { success: false, error: 'Thread not found' }
    }

    // Build a minimal context: first user message + first assistant message
    const userMsg = thread.messages.find((m) => m.role === 'user')
    const assistantMsg = thread.messages.find((m) => m.role === 'assistant')
    if (!userMsg) {
      return { success: false, error: 'No user message in thread' }
    }
    const contextMessages = [userMsg, ...(assistantMsg ? [assistantMsg] : [])]

    // Read the currently selected model + its credentials
    const selected = readSelectedModel()
    if (!selected.provider || !selected.model) {
      return { success: false, error: 'No model selected' }
    }

    const provider = CHAT_PROVIDERS.find((p) => p.id === selected.provider)
    if (!provider) {
      return { success: false, error: `Unknown provider: ${selected.provider}` }
    }

    const providerSettings = readChatProvider(selected.provider)
    if (!providerSettings) {
      return { success: false, error: 'Provider settings not found' }
    }

    const request = isLocalProvider(selected.provider)
      ? {
          chatId: threadId,
          messages: contextMessages,
          provider: selected.provider,
          model: selected.model,
          endpointURL: providerSettings.endpointURL ?? '',
        }
      : {
          chatId: threadId,
          messages: contextMessages,
          provider: selected.provider,
          model: selected.model,
          apiKey: providerSettings.apiKey ?? '',
        }

    const model = createModelFromRequest(provider, request)

    const { text } = await generateText({
      model,
      system: TITLE_SYSTEM_PROMPT,
      messages: await convertToModelMessages(contextMessages),
      maxTokens: 20,
    })

    const title = text
      .trim()
      .replace(/[.!?]+$/, '')
      .trim()
    if (!title) {
      return { success: false, error: 'Empty title generated' }
    }

    // Re-check before writing — the user may have renamed during the LLM round-trip
    const latestThread = getThread(threadId)
    if (latestThread?.titleEditedByUser) {
      log.info(
        `[THREADS] Skipped auto-generated title for thread ${threadId} — manually edited during generation`
      )
      return { success: true, title: latestThread.title }
    }

    updateThread(threadId, { title, titleEditedByUser: false })
    log.info(
      `[THREADS] Auto-generated title for thread ${threadId}: "${title}"`
    )
    return { success: true, title }
  } catch (error) {
    log.error(
      `[THREADS] Failed to generate title for thread ${threadId}:`,
      error
    )
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
