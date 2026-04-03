import { Info } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert'
import { useMcpOptimizerBannerVisible } from '@/common/hooks/use-mcp-optimizer-banner-visible'

const BLOG_POST_URL =
  'https://stacklok.com/blog/mcp-optimizer-is-now-built-into-the-stacklok-platform/?utm_source=toolhive-studio'

export function McpOptimizerSunsetBanner() {
  const isVisible = useMcpOptimizerBannerVisible()

  if (!isVisible) return null

  return (
    <Alert className={'flex justify-center rounded-none border-x-0'}>
      <Info />
      <AlertDescription>
        <p>
          MCP Optimizer is leaving the desktop app. Learn about its future{' '}
          <a
            href={BLOG_POST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4"
          >
            here
          </a>
          .
        </p>
      </AlertDescription>
    </Alert>
  )
}
