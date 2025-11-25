import { ZodError, ZodType } from 'zod/v4'
import type {
  FieldError,
  FieldErrors,
  FieldValues,
  Resolver,
  ResolverOptions,
  ResolverResult,
} from 'react-hook-form'

const zodToHookFormErrors = <TFieldValues extends FieldValues>(
  zodError: ZodError
): FieldErrors<TFieldValues> => {
  const errors: Record<string, FieldError> = {}

  for (const issue of zodError.issues) {
    const path = issue.path.join('.') || 'root'
    errors[path] = {
      type: issue.code,
      message: issue.message,
    } as FieldError
  }

  return errors as FieldErrors<TFieldValues>
}

export const zodV4Resolver =
  <TFieldValues extends FieldValues = FieldValues, TContext = unknown>(
    schema: ZodType
  ): Resolver<TFieldValues, TContext> =>
  async (
    values: TFieldValues,
    _context?: TContext,
    _options?: ResolverOptions<TFieldValues>
  ): Promise<ResolverResult<TFieldValues>> => {
    // _context and _options are unused but required by the Resolver signature
    void _context
    void _options
    try {
      const result = await schema.safeParseAsync(values)

      if (result.success) {
        return {
          values: result.data as TFieldValues,
          errors: {},
        }
      } else {
        return {
          values: {},
          errors: zodToHookFormErrors<TFieldValues>(result.error),
        }
      }
    } catch (error) {
      console.error('Resolver error: ', error)
      return {
        values: {},
        errors: {
          root: {
            type: 'unknown',
            message: 'An unknown error occurred during validation',
          } as FieldError,
        } as FieldErrors<TFieldValues>,
      }
    }
  }
