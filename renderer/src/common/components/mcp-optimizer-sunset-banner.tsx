import { Info } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert'
import { useMcpOptimizerBannerVisible } from '@/common/hooks/use-mcp-optimizer-banner-visible'
import { APP_IDENTIFIER, MCP_OPTIMIZER_SUNSET_BLOG_URL } from '@common/app-info'

const BLOG_POST_URL = `${MCP_OPTIMIZER_SUNSET_BLOG_URL}?utm_source=${APP_IDENTIFIER}`

export function McpOptimizerSunsetBanner() {
  const isVisible = useMcpOptimizerBannerVisible()

  if (!isVisible) return null

  return (
    <Alert className="flex justify-center rounded-none border-x-0">
      <Info />
      <AlertDescription>
        <p>
          MCP Optimizer is leaving the desktop app.{' '}
          <a
            href={BLOG_POST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4"
          >
            Learn about its future
          </a>
          .
        </p>
      </AlertDescription>
    </Alert>
  )
}
