import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <div className={cn("flex items-center justify-center mb-8 overflow-x-auto pb-2", className)}>
      <div className="flex items-center flex-nowrap min-w-max">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 sm:w-10 sm:h-10 sm:text-sm",
                  {
                    "bg-primary text-primary-foreground animate-glow-pulse": index === currentStep,
                    "bg-accent text-accent-foreground": index < currentStep,
                    "bg-muted text-muted-foreground": index > currentStep,
                  }
                )}
              >
                {index < currentStep ? (
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 animate-scale-in" />
                ) : (
                  <span className="text-xs sm:text-sm">{index + 1}</span>
                )}
              </div>
              <span className="text-xs mt-2 text-center font-medium max-w-[60px] sm:max-w-[80px] truncate">
                {step}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-8 mx-1 rounded-full transition-all duration-500 flex-shrink-0 sm:w-16 sm:mx-2",
                  index < currentStep
                    ? "bg-accent animate-slide-right"
                    : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}