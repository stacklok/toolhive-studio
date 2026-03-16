import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TooltipProvider } from '@radix-ui/react-tooltip'
import { ThemeProvider } from './common/components/theme/theme-provider'
import { PromptProvider } from './common/contexts/prompt/provider'
import { PermissionsProvider } from './common/contexts/permissions/permissions-provider'
import type { Permissions } from './common/contexts/permissions'
import { queryClient } from './common/lib/query-client'

const TOOLTIP_DELAY_DURATION = 0

interface AppProvidersProps {
  children: React.ReactNode
  permissions?: Partial<Permissions>
}

export function AppProviders({ children, permissions }: AppProvidersProps) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="toolhive-ui-theme">
      <PermissionsProvider value={permissions}>
        <PromptProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider delayDuration={TOOLTIP_DELAY_DURATION}>
              {children}
            </TooltipProvider>
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </PromptProvider>
      </PermissionsProvider>
    </ThemeProvider>
  )
}
