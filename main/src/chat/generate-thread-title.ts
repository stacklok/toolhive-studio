import { Effect } from 'effect'
import { runChatToResult } from './runtime'
import { TitleService } from './streaming/title-service'

export async function generateThreadTitle(
  threadId: string
): Promise<{ success: boolean; title?: string; error?: string }> {
  return runChatToResult(
    TitleService.generateThreadTitle(threadId).pipe(
      Effect.map(({ title }) => ({ title }))
    )
  )
}
