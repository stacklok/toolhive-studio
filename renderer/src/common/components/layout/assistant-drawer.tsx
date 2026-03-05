import { PanelRightClose, MessageCircle } from 'lucide-react'
import { ChatInterface } from '@/features/chat/components/chat-interface'
import { useAssistantDrawer } from '@/common/hooks/use-assistant-drawer'
import { cn } from '@/common/lib/utils'
import { WindowControls } from './top-nav/window-controls'

export function AssistantDrawer() {
  const { isOpen, close } = useAssistantDrawer()

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
          'transform-gpu transition-transform duration-200 ease-linear',
          isOpen ? 'translate-x-0' : 'translate-x-full'
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
            className="app-region-no-drag flex items-center gap-2 px-4
              text-white"
          >
            <MessageCircle className="size-5" />
            <span className="font-semibold">Assistant</span>
          </div>
          <div className="flex items-center">
            <button
              onClick={close}
              aria-label="Close Assistant"
              className={cn(
                'app-region-no-drag',
                `border-nav-border flex size-16 shrink-0 items-center
                justify-center border-l`,
                `text-white/90 transition-colors hover:bg-white/10
                hover:text-white`
              )}
            >
              <PanelRightClose className="size-5" />
            </button>
            <div className="pr-4">
              <WindowControls />
            </div>
          </div>
        </div>
        <div
          className="bg-background border-border min-h-0 flex-1 overflow-hidden
            border-l px-8 py-5"
        >
          <ChatInterface hideTitle />
        </div>
      </div>
    </>
  )
}
