import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface Step {
  id: number
  label: string
  icon?: LucideIcon
  optional?: boolean
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id
          const isCompleted = currentStep > step.id
          const isLast = index === steps.length - 1

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                    isCompleted && "bg-green-600 border-green-600",
                    isActive && "bg-amber-600 border-amber-600 ring-4 ring-amber-100 dark:ring-amber-900/30",
                    !isCompleted && !isActive && "bg-muted border-muted-foreground/30"
                  )}
                >
                  {step.icon ? (
                    <step.icon
                      className={cn(
                        "h-5 w-5",
                        (isCompleted || isActive) && "text-white",
                        !isCompleted && !isActive && "text-muted-foreground"
                      )}
                    />
                  ) : (
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        (isCompleted || isActive) && "text-white",
                        !isCompleted && !isActive && "text-muted-foreground"
                      )}
                    >
                      {step.id}
                    </span>
                  )}
                </div>

                {/* Step Label */}
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isActive && "text-amber-600 dark:text-amber-500",
                      isCompleted && "text-green-600 dark:text-green-500",
                      !isCompleted && !isActive && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  {step.optional && (
                    <p className="text-xs text-muted-foreground mt-0.5">(opcional)</p>
                  )}
                  {isActive && (
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5 font-medium">
                      Actual
                    </p>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className="flex-1 h-0.5 mx-4 mb-8">
                  <div
                    className={cn(
                      "h-full transition-colors",
                      isCompleted ? "bg-green-600" : "bg-muted-foreground/30"
                    )}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
