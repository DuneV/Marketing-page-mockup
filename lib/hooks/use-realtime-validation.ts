import { useEffect, useState } from "react"
import { FieldPath, FieldValues, UseFormReturn } from "react-hook-form"

interface UseRealtimeValidationOptions<TFieldValues extends FieldValues> {
  form: UseFormReturn<TFieldValues>
  fieldName: FieldPath<TFieldValues>
  asyncValidator?: (value: string) => Promise<boolean>
  debounceMs?: number
}

interface ValidationState {
  isValid: boolean
  isInvalid: boolean
  isValidating: boolean
  error?: string
}

export function useRealtimeValidation<TFieldValues extends FieldValues>({
  form,
  fieldName,
  asyncValidator,
  debounceMs = 500,
}: UseRealtimeValidationOptions<TFieldValues>): ValidationState {
  const [isValidating, setIsValidating] = useState(false)
  const value = form.watch(fieldName)
  const error = form.formState.errors[fieldName]
  const isDirty = form.formState.dirtyFields[fieldName]

  useEffect(() => {
    if (!asyncValidator || !value || error) {
      setIsValidating(false)
      return
    }

    setIsValidating(true)
    const timeout = setTimeout(async () => {
      try {
        await asyncValidator(value as string)
        setIsValidating(false)
      } catch {
        setIsValidating(false)
      }
    }, debounceMs)

    return () => {
      clearTimeout(timeout)
      setIsValidating(false)
    }
  }, [value, asyncValidator, debounceMs, error])

  const hasValue = value !== undefined && value !== ""
  const isValid = !error && hasValue && isDirty && !isValidating
  const isInvalid = !!error && isDirty

  return {
    isValid,
    isInvalid,
    isValidating,
    error: error?.message as string | undefined,
  }
}
