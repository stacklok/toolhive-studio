import { Zap, ArrowRight, Hash } from 'lucide-react'
import type { LanguageModelV2Usage } from '@ai-sdk/provider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/common/components/ui/tooltip'

interface TokenUsageProps {
  usage: LanguageModelV2Usage
  responseTime?: number
}

export function TokenUsage({ usage, responseTime }: TokenUsageProps) {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <TooltipProvider>
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex cursor-help items-center gap-1">
              <Hash className="h-3 w-3" />
              <span>{usage.inputTokens || 0}</span>
              <ArrowRight className="h-3 w-3" />
              <span>{usage.outputTokens || 0}</span>
              <span className="text-foreground font-medium">
                = {usage.totalTokens || 0}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <div className="font-medium">Token Usage Breakdown</div>
              <div className="space-y-0.5 text-xs">
                <div>
                  <strong>Input tokens:</strong>{' '}
                  {(usage.inputTokens || 0).toLocaleString()} (your message +
                  context)
                </div>
                <div>
                  <strong>Output tokens:</strong>{' '}
                  {(usage.outputTokens || 0).toLocaleString()} (AI response)
                </div>
                {usage.reasoningTokens &&
                  !isNaN(usage.reasoningTokens) &&
                  usage.reasoningTokens > 0 && (
                    <div>
                      <strong>Reasoning tokens:</strong>{' '}
                      {usage.reasoningTokens.toLocaleString()} (internal
                      reasoning)
                    </div>
                  )}
                {usage.cachedInputTokens &&
                  !isNaN(usage.cachedInputTokens) &&
                  usage.cachedInputTokens > 0 && (
                    <div>
                      <strong>Cached input tokens:</strong>{' '}
                      {usage.cachedInputTokens.toLocaleString()} (cached from
                      previous requests)
                    </div>
                  )}
                <div className="border-t pt-1">
                  <strong>Total tokens:</strong>{' '}
                  {(usage.totalTokens || 0).toLocaleString()}
                </div>
              </div>
              <div className="text-muted-foreground border-t pt-1 text-xs">
                Tokens are units of text that AI models process. More tokens =
                higher cost.
              </div>
            </div>
          </TooltipContent>
        </Tooltip>

        {responseTime && (
          <>
            <span>•</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-help items-center gap-1">
                  <Zap className="h-3 w-3" />
                  <span>{formatTime(responseTime)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <div className="space-y-1">
                  <div className="font-medium">Response Time</div>
                  <div className="text-xs">
                    Time taken to generate the complete response:{' '}
                    <strong>{formatTime(responseTime)}</strong>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  )
}
