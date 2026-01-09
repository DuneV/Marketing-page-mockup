import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Control, FieldPath, FieldValues } from "react-hook-form"
import { cn } from "@/lib/utils"

interface FormFieldWithValidationProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  placeholder?: string
  required?: boolean
  showValidationIcon?: boolean
  helpText?: string
  type?: "text" | "email" | "number" | "password" | "textarea"
  disabled?: boolean
  isValidating?: boolean
  className?: string
}

export function FormFieldWithValidation<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  required = false,
  showValidationIcon = true,
  helpText,
  type = "text",
  disabled = false,
  isValidating = false,
  className,
}: FormFieldWithValidationProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const hasError = fieldState.error
        const hasValue = field.value !== undefined && field.value !== ""
        const isValid = !hasError && hasValue && fieldState.isDirty
        const showSuccess = isValid && showValidationIcon
        const showError = hasError && showValidationIcon

        return (
          <FormItem className={cn("relative", className)}>
            <FormLabel>
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
              {!required && <span className="text-muted-foreground text-xs ml-1">(opcional)</span>}
            </FormLabel>
            <div className="relative">
              <FormControl>
                {type === "textarea" ? (
                  <Textarea
                    {...field}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={cn(
                      "pr-10",
                      hasError && "border-red-500 focus-visible:ring-red-500",
                      isValid && "border-green-500 focus-visible:ring-green-500"
                    )}
                  />
                ) : (
                  <Input
                    {...field}
                    type={type}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={cn(
                      "pr-10",
                      hasError && "border-red-500 focus-visible:ring-red-500",
                      isValid && "border-green-500 focus-visible:ring-green-500"
                    )}
                  />
                )}
              </FormControl>
              {showValidationIcon && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isValidating && <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />}
                  {!isValidating && showSuccess && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {!isValidating && showError && <XCircle className="h-4 w-4 text-red-600" />}
                </div>
              )}
            </div>
            {helpText && !hasError && (
              <p className="text-xs text-muted-foreground mt-1">{helpText}</p>
            )}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
