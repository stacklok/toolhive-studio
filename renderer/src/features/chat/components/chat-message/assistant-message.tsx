import { formatDistanceToNow } from 'date-fns'
import { Bot } from 'lucide-react'
import { Fragment } from 'react'
import type { ChatStatus } from 'ai'
import { TokenUsage } from './token-usage'
import { NoContentMessage } from './no-content-message'
import { McpAppView } from './mcp-app-view'
import { SkillBuildResultCard } from '../tool-results/skill-build-result-card'
import { parseSkillBuildResult } from '../../lib/parse-skill-build-result'
import { getProviderIconByModel } from '../provider-icons'
import type { ChatUIMessage } from '../../types'
import type { ToolUiMetadataEntry } from '../../hooks/use-mcp-app-metadata'
import { ReasoningComponent } from './reasoning-component'
import { StepStartComponent } from './step-start-component'
import { ToolCallComponent } from './tool-call-component'
import { JoinedAssistantText } from './joined-assistant-text'
import { MessageActions } from './message-actions'
import { getMessageCopyText } from '../../lib/message-copy-text'

interface AssistantMessageProps {
  message: ChatUIMessage
  status: ChatStatus
  toolUiMetadata: Record<string, ToolUiMetadataEntry>
}

export function AssistantMessage({
  message,
  status,
  toolUiMetadata: uiMetadata,
}: AssistantMessageProps) {
  const providerIcon =
    message.metadata?.model &&
    getProviderIconByModel(message.metadata.model, message.metadata.providerId)
  const copyText = getMessageCopyText(message)

  return (
    <div className="group flex items-start gap-4">
      <div
        className="bg-card flex h-8 w-8 shrink-0 items-center justify-center
          rounded-lg"
      >
        {providerIcon ?? <Bot className="h-4 w-4" />}
      </div>

      <div className="min-w-0 flex-1 space-y-2 pr-2">
        <div className="break-words">
          {message.parts.map((part, index) => {
            switch (part.type) {
              case 'text':
                return null

              case 'step-start':
                return (
                  <StepStartComponent
                    key={`step-start-${index}`}
                    part={part}
                    index={index}
                  />
                )

              case 'reasoning':
                return (
                  <ReasoningComponent
                    key={`reasoning-${index}`}
                    part={part}
                    status={status}
                    disclosureKey={`${message.id}:${index}`}
                  />
                )

              case 'dynamic-tool': {
                const dynToolName =
                  'toolName' in part ? String(part.toolName) : null
                const dynUi = dynToolName ? uiMetadata[dynToolName] : undefined
                return (
                  <Fragment key={`dynamic-tool-${index}`}>
                    <ToolCallComponent
                      part={part}
                      status={status}
                      disclosureKey={`${message.id}:${index}`}
                    />
                    {dynUi &&
                      'state' in part &&
                      part.state === 'output-available' && (
                        <McpAppView
                          toolName={dynToolName!}
                          serverName={dynUi.serverName}
                          resourceUri={dynUi.resourceUri}
                          toolInput={
                            'input' in part && part.input !== undefined
                              ? (part.input as Record<string, unknown>)
                              : {}
                          }
                          toolResult={
                            'output' in part ? part.output : undefined
                          }
                        />
                      )}
                  </Fragment>
                )
              }

              case 'file':
                return (
                  <div
                    key={`file-${index}`}
                    className="bg-muted/50 my-3 rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">
                        File: {'name' in part ? String(part.name) : 'Unknown'}
                      </div>
                      {('url' in part || 'data' in part) && (
                        <a
                          href={
                            'url' in part
                              ? String(part.url)
                              : `data:application/octet-stream;base64,${String((part as Record<string, unknown>).data || '')}`
                          }
                          download={'name' in part ? String(part.name) : 'file'}
                          className="text-primary text-sm hover:underline"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                )

              default:
                if ((part as Record<string, unknown>).type === 'image') {
                  return (
                    <div key={`image-${index}`} className="my-3">
                      <div className="bg-card rounded-lg border p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-foreground text-sm font-medium">
                            {'alt' in part
                              ? String((part as Record<string, unknown>).alt)
                              : 'Generated Image'}
                          </span>
                        </div>
                        {'data' in part && (
                          <img
                            src={`data:${'mimeType' in part ? String((part as Record<string, unknown>).mimeType) : 'image/png'};base64,${String((part as Record<string, unknown>).data)}`}
                            alt={
                              'alt' in part
                                ? String((part as Record<string, unknown>).alt)
                                : 'Generated image'
                            }
                            className="h-auto max-w-full rounded-lg border"
                          />
                        )}
                      </div>
                    </div>
                  )
                }

                if (part.type.startsWith('tool-')) {
                  const staticToolName = part.type.replace('tool-', '')
                  const staticUi = uiMetadata[staticToolName]
                  const skillBuildResult =
                    staticToolName === 'build_skill' &&
                    'state' in part &&
                    part.state === 'output-available' &&
                    'output' in part
                      ? parseSkillBuildResult(part.output)
                      : null
                  return (
                    <Fragment key={`tool-${index}`}>
                      <ToolCallComponent
                        part={part}
                        status={status}
                        disclosureKey={`${message.id}:${index}`}
                      />
                      {skillBuildResult && (
                        <SkillBuildResultCard result={skillBuildResult} />
                      )}
                      {staticUi &&
                        'state' in part &&
                        part.state === 'output-available' && (
                          <McpAppView
                            toolName={staticToolName}
                            serverName={staticUi.serverName}
                            resourceUri={staticUi.resourceUri}
                            toolInput={
                              'input' in part && part.input !== undefined
                                ? (part.input as Record<string, unknown>)
                                : {}
                            }
                            toolResult={
                              'output' in part ? part.output : undefined
                            }
                          />
                        )}
                    </Fragment>
                  )
                }
                return null
            }
          })}

          <JoinedAssistantText parts={message.parts} status={status} />

          <NoContentMessage message={message} />
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground text-xs">
              {formatDistanceToNow(
                message.metadata?.createdAt
                  ? new Date(message.metadata.createdAt)
                  : new Date(),
                { addSuffix: true }
              )}
              {message.metadata?.model && (
                <span className="text-muted-foreground/70 ml-2">
                  • {message.metadata.model}
                </span>
              )}
            </div>
            {copyText && <MessageActions copyText={copyText} />}
          </div>

          {message.role === 'assistant' && (
            <TokenUsage
              usage={
                message.metadata?.totalUsage || {
                  inputTokens: 0,
                  outputTokens: 0,
                  totalTokens: 0,
                }
              }
              responseTime={message.metadata?.responseTime}
              providerId={message.metadata?.providerId}
              model={message.metadata?.model}
              isStreaming={status === 'streaming' || status === 'submitted'}
            />
          )}
        </div>
      </div>
    </div>
  )
}
