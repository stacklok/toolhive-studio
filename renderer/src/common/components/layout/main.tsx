import type { ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'
import { useMcpOptimizerBannerVisible } from '@/common/hooks/use-mcp-optimizer-banner-visible'
import { MCP_OPTIMIZER_BANNER_HEIGHT_REM } from '@/common/lib/constants'

export function Main(props: { children: ReactNode; className?: string }) {
  const isBannerVisible = useMcpOptimizerBannerVisible()

  return (
    <main
      {...props}
      className={twMerge(
        'flex min-h-0 w-full flex-1 flex-col',
        'h-[calc(100dvh-calc(var(--spacing)_*_16))] overflow-y-auto',
        'px-8 py-5',
        '[view-transition-name:main-content]',
        props.className
      )}
      style={{
        scrollbarGutter: 'stable both-edges',
        height: isBannerVisible
          ? `calc(100dvh - 4rem - ${MCP_OPTIMIZER_BANNER_HEIGHT_REM})`
          : undefined,
      }}
    />
  )
}
