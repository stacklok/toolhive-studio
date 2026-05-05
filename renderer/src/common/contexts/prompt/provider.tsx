import { type ReactNode } from 'react'
import { PromptContext, type ReactHookFormPromptConfig } from '.'
import { FormDialog } from './form-prompt-dialog'
import { DialogProvider } from '@/common/contexts/dialog/provider'
import { useDialog } from '@/common/hooks/use-dialog'

function PromptBridge({ children }: { children: ReactNode }) {
  const showDialog = useDialog()

  const promptForm = <TValues extends Record<string, unknown>>(
    config: ReactHookFormPromptConfig<TValues>
  ): Promise<TValues | null> =>
    showDialog<TValues>(({ resolve, dismiss }) => (
      <FormDialog
        config={config as ReactHookFormPromptConfig<Record<string, unknown>>}
        onSubmit={(data) => resolve(data as TValues)}
        onCancel={dismiss}
      />
    ))

  return (
    <PromptContext.Provider value={{ promptForm }}>
      {children}
    </PromptContext.Provider>
  )
}

export function PromptProvider({ children }: { children: ReactNode }) {
  return (
    <DialogProvider>
      <PromptBridge>{children}</PromptBridge>
    </DialogProvider>
  )
}
