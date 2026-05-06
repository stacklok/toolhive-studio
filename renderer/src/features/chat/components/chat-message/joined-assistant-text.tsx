import { Streamdown } from 'streamdown'
import { code } from '@streamdown/code'
import { mermaid } from '@streamdown/mermaid'
import { cjk } from '@streamdown/cjk'
import type { ChatStatus } from 'ai'
import type { ChatUIMessage } from '../../types'
import { STREAMDOWN_PROSE_CLASS } from '@/common/lib/streamdown-prose'

interface TextPart {
  type: 'text'
  text: string
}

interface JoinedAssistantTextProps {
  parts: ChatUIMessage['parts']
  status: ChatStatus
}

export function JoinedAssistantText({
  parts,
  status,
}: JoinedAssistantTextProps) {
  const allTextContent = parts
    .filter((p): p is TextPart => p.type === 'text' && 'text' in p)
    .map((p) => p.text || '')
    .join('')

  if (!allTextContent.trim()) return null

  return (
    <div>
      <Streamdown
        plugins={{ code, mermaid, cjk }}
        isAnimating={status === 'streaming'}
        className={STREAMDOWN_PROSE_CLASS}
      >
        {allTextContent}
      </Streamdown>
    </div>
  )
}
