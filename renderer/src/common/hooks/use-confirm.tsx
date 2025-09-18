import { type ReactNode } from 'react'
import { usePrompt } from '@/common/hooks/use-prompt'
import { Checkbox } from '@/common/components/ui/checkbox'
import { type ConfirmConfig } from '@/common/confirm'
import { z } from 'zod/v4'
import { zodV4Resolver } from '@/common/lib/zod-v4-resolver'

export function useConfirm() {
  const prompt = usePrompt()

  return async (message: ReactNode, config: ConfirmConfig) => {
    // Fast-path skip if previously remembered
    if (config.doNotShowAgain) {
      const key = `doNotShowAgain_${config.doNotShowAgain.id}`
      const saved =
        typeof window !== 'undefined' ? localStorage.getItem(key) : null
      if (saved === 'true') return true
    }

    const formSchema = z.object({
      doNotShowAgain: z.boolean().optional(),
    })

    const titleStr =
      typeof config.title === 'string' ? (config.title as string) : undefined

    const result = await prompt({
      title: titleStr,
      description: config.description,
      defaultValues: { doNotShowAgain: false },
      resolver: zodV4Resolver(formSchema),
      disableSubmitUntilValid: false,
      fields: (form) => (
        <div className="space-y-4">
          <div className="py-2">{message}</div>
          {config.doNotShowAgain && (
            <label className="flex cursor-pointer items-center space-x-2">
              <Checkbox
                checked={!!form.watch('doNotShowAgain')}
                onCheckedChange={(checked) => {
                  form.setValue('doNotShowAgain', checked === true, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }}
              />
              <span className="text-sm">{config.doNotShowAgain.label}</span>
            </label>
          )}
        </div>
      ),
      buttons: {
        confirm:
          (typeof config.buttons?.yes === 'string'
            ? (config.buttons?.yes as string)
            : undefined) ?? 'Yes',
        cancel:
          (typeof config.buttons?.no === 'string'
            ? (config.buttons?.no as string)
            : undefined) ?? 'No',
        confirmVariant: config.isDestructive ? 'destructive' : 'default',
        cancelVariant: 'secondary',
      },
    })

    const confirmed = result !== null

    if (
      confirmed &&
      config.doNotShowAgain &&
      (result as { doNotShowAgain?: boolean } | null)?.doNotShowAgain
    ) {
      const key = `doNotShowAgain_${config.doNotShowAgain.id}`
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, 'true')
      }
    }

    return confirmed
  }
}
