import { formatDistanceToNow } from 'date-fns'
import { User } from 'lucide-react'
import { Streamdown } from 'streamdown'
import { code } from '@streamdown/code'
import { mermaid } from '@streamdown/mermaid'
import { cjk } from '@streamdown/cjk'
import type { ChatStatus } from 'ai'
import { AttachmentPreview } from './attachment-preview'
import { MessageActions } from './message-actions'
import { getMessageCopyText } from '../../lib/message-copy-text'
import { useChatComposer } from '../chat-composer-context'
import type { ChatUIMessage } from '../../types'

interface UserMessageProps {
  message: ChatUIMessage
  status: ChatStatus
}

function UserAttachments({ parts }: { parts: ChatUIMessage['parts'] }) {
  const fileAttachments = parts.filter((p) => p.type === 'file')
  if (fileAttachments.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {fileAttachments.map((attachment, index) => (
        <AttachmentPreview
          key={index}
          attachment={attachment}
          totalAttachments={fileAttachments.length}
        />
      ))}
    </div>
  )
}

export function UserMessage({ message, status }: UserMessageProps) {
  const copyText = getMessageCopyText(message)
  const composer = useChatComposer()

  // Edit only makes sense when we have a composer to drive AND there's text
  // to edit. Attachment-only messages (text empty after trimming) skip the
  // affordance — there's nothing to pre-fill, and editing the file list
  // isn't supported in V1.
  const onEdit =
    composer && copyText
      ? () => {
          composer.setDraftText(copyText)
          composer.focusComposer()
        }
      : undefined

  return (
    <div className="group flex justify-end">
      <div className="flex max-w-[80%] items-start gap-3">
        <div className="space-y-2">
          <div
            className="bg-secondary text-secondary-foreground rounded-2xl
              rounded-br-md px-4 py-3 shadow-sm"
          >
            <div className="break-words">
              <Streamdown
                plugins={{ code, mermaid, cjk }}
                isAnimating={status === 'streaming'}
                className="prose prose-sm max-w-none [&_code]:text-sm
                  [&_em]:italic [&_p]:mb-0 [&_p:last-child]:mb-0 [&_pre]:text-xs
                  [&_strong]:font-bold"
              >
                {message.parts.find((p) => p.type === 'text' && 'text' in p)
                  ?.text || ''}
              </Streamdown>
            </div>
            <UserAttachments parts={message.parts} />
          </div>

          <div className="flex items-center justify-end gap-2">
            {copyText && <MessageActions copyText={copyText} onEdit={onEdit} />}
            <div className="text-muted-foreground text-right text-xs">
              {formatDistanceToNow(
                message.metadata?.createdAt
                  ? new Date(message.metadata.createdAt)
                  : new Date(),
                { addSuffix: true }
              )}
            </div>
          </div>
        </div>

        <div
          className="bg-card flex h-8 w-8 shrink-0 items-center justify-center
            rounded-lg"
        >
          <User className="text-primary h-4 w-4" />
        </div>
      </div>
    </div>
  )
}
