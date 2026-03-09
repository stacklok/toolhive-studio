import { useEffect, useState } from 'react'
import { PanelRightClose, MessageCircle } from 'lucide-react'
import { ChatInterface } from '@/features/chat/components/chat-interface'
import { useAssistantDrawer } from '@/common/hooks/use-assistant-drawer'
import { cn } from '@/common/lib/utils'
import { WindowControls } from './top-nav/window-controls'
import { getOsDesignVariant } from '@/common/lib/os-design'

const ANIMATION_DURATION_MS = 200

export function AssistantDrawer() {
  const { isOpen, close } = useAssistantDrawer()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // rAF is only here to satisfy the ESLint no-sync-setState-in-effect rule.
      // The entry animation is handled by CSS (animate-in), which fires
      // automatically on mount — no class toggling needed.
      const frame = requestAnimationFrame(() => setIsMounted(true))
      return () => cancelAnimationFrame(frame)
    } else {
      // Unmount after the slide-out animation rather than using
      // visibility/display/pointer-events. In Electron, -webkit-app-region
      // is not applied when pointer-events: none, so a hidden-but-mounted
      // drawer would still claim its off-screen region as a drag area,
      // making buttons in the navbar beneath it unclickable.
      const timer = setTimeout(() => setIsMounted(false), ANIMATION_DURATION_MS)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isMounted) return null

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={close}
          aria-hidden="true"
        />
      )}
      <div
        className={cn(
          'app-region-no-drag',
          'fixed top-0 right-0 z-50 flex h-dvh flex-col',
          'w-[700px] max-w-full',
          'duration-200',
          isOpen
            ? 'animate-in slide-in-from-right fill-mode-backwards'
            : 'animate-out slide-out-to-right fill-mode-forwards'
        )}
        aria-label="Assistant"
      >
        <div
          className={cn(
            'bg-nav-background border-nav-border',
            'flex h-16 shrink-0 items-center justify-between',
            'border-b border-l'
          )}
        >
          <div
            className="app-region-no-drag border-nav-border flex h-full
              items-center gap-3 border-l px-4 text-white"
          >
            <MessageCircle className="size-[22px]" />
            <span className="font-serif text-2xl font-light tracking-tight">
              Assistant
            </span>
          </div>
          <div className="flex items-center">
            {/* macOS: separator left of close button (no window controls on the right) */}
            {getOsDesignVariant() === 'mac' && (
              <div className="border-nav-border mx-4 self-stretch border-l" />
            )}
            <button
              onClick={close}
              aria-label="Close Assistant"
              className={cn(
                'app-region-no-drag',
                'flex size-16 shrink-0 items-center justify-center',
                `text-white/90 transition-colors hover:bg-white/10
                hover:text-white`
              )}
            >
              <PanelRightClose className="size-5" />
            </button>
            {/* Windows: separator right of close button, between it and window controls */}
            {getOsDesignVariant() !== 'mac' && (
              <div className="border-nav-border mx-4 self-stretch border-l" />
            )}
            <div className="pr-6">
              <WindowControls />
            </div>
          </div>
        </div>
        <div
          className="bg-background border-border flex min-h-0 flex-1 flex-col
            overflow-hidden border-l px-8 pt-4 pb-8"
        >
          <ChatInterface hideTitle />
        </div>
      </div>
    </>
  )
}
