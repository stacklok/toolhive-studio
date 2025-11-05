import { Zap, ArrowRight, Hash, Info } from 'lucide-react'
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
  providerId?: string
}

export function TokenUsage({
  usage,
  responseTime,
  providerId,
}: TokenUsageProps) {
  const safeNumber = (value: number | undefined): number => {
    if (
      value === undefined ||
      value === null ||
      isNaN(value) ||
      !isFinite(value)
    ) {
      return 0
    }
    return Math.max(0, Math.floor(value))
  }

  const formatTime = (ms: number) => {
    const safeMs = safeNumber(ms)
    if (safeMs < 1000) return `${safeMs}ms`
    return `${(safeMs / 1000).toFixed(1)}s`
  }

  const inputTokens = safeNumber(usage.inputTokens)
  const outputTokens = safeNumber(usage.outputTokens)
  const totalTokens = safeNumber(usage.totalTokens)
  const reasoningTokens = safeNumber(usage.reasoningTokens)
  const cachedInputTokens = safeNumber(usage.cachedInputTokens)

  const hasUsageData = totalTokens > 0 || inputTokens > 0 || outputTokens > 0
  const isLMStudio = providerId === 'lmstudio'

  return (
    <TooltipProvider>
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        {isLMStudio && !hasUsageData ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex cursor-help items-center gap-1">
                <Info className="h-3 w-3" />
                <span>No token usage data</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-1">
                <div className="font-medium">Token Usage Unavailable</div>
                <div className="text-xs">
                  LM Studio doesn't currently provide token usage metrics in its
                  API responses. This is a known limitation of LM Studio's
                  current implementation.
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex cursor-help items-center gap-1">
                <Hash className="h-3 w-3" />
                <span>{inputTokens}</span>
                <ArrowRight className="h-3 w-3" />
                <span>{outputTokens}</span>
                <span className="text-foreground font-medium">
                  = {totalTokens}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-1">
                <div className="font-medium">Token Usage Breakdown</div>
                <div className="space-y-0.5 text-xs">
                  <div>
                    <strong>Input tokens:</strong>{' '}
                    {inputTokens.toLocaleString()} (your message + context)
                  </div>
                  <div>
                    <strong>Output tokens:</strong>{' '}
                    {outputTokens.toLocaleString()} (AI response)
                  </div>
                  {reasoningTokens > 0 && (
                    <div>
                      <strong>Reasoning tokens:</strong>{' '}
                      {reasoningTokens.toLocaleString()} (internal reasoning)
                    </div>
                  )}
                  {cachedInputTokens > 0 && (
                    <div>
                      <strong>Cached input tokens:</strong>{' '}
                      {cachedInputTokens.toLocaleString()} (cached from previous
                      requests)
                    </div>
                  )}
                  <div className="border-t pt-1">
                    <strong>Total tokens:</strong>{' '}
                    {totalTokens.toLocaleString()}
                  </div>
                </div>
                <div className="text-muted-foreground border-t pt-1 text-xs">
                  Tokens are units of text that AI models process. More tokens =
                  higher cost.
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {responseTime && !isNaN(responseTime) && isFinite(responseTime) && (
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
