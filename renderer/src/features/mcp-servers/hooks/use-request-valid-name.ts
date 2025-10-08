import { usePrompt, generateSimplePrompt } from '@/common/hooks/use-prompt'
import { z } from 'zod/v4'

interface RequestNameOptions {
  initialValue: string
  title?: string
  rejectedName?: string | null
  validateOnMount?: boolean
}

export function useRequestName() {
  const prompt = usePrompt()

  return async ({
    initialValue,
    title = 'Copy server to a group',
    rejectedName = null,
    validateOnMount = false,
  }: RequestNameOptions): Promise<string | null> => {
    const validationSchema = z
      .string()
      .min(1, 'Name is required')
      .refine((name) => name !== rejectedName, {
        message: 'This name is already taken. Please choose another name.',
      })

    const nameResult = await prompt({
      ...generateSimplePrompt({
        inputType: 'text',
        initialValue,
        title,
        placeholder: 'Enter server name...',
        label: 'Name',
        validationSchema,
      }),
      buttons: {
        confirm: 'OK',
        cancel: 'Cancel',
      },
      validateOnMount,
    })

    if (!nameResult) {
      return null // User cancelled
    }

    return nameResult.value
  }
}
