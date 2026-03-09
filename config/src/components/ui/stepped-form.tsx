import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StepIndicator } from "@/components/ui/step-indicator";
import { cn } from "@/lib/utils";

interface SteppedFormProps {
  steps: {
    title: string;
    description?: string;
    content: React.ReactNode;
  }[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onSubmit?: () => void;
  isLoading?: boolean;
  canProceed?: boolean;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  additionalFooter?: React.ReactNode;
}

export function SteppedForm({
  steps,
  currentStep,
  onStepChange,
  onNext,
  onPrevious,
  onSubmit,
  isLoading = false,
  canProceed = true,
  title,
  description,
  icon,
  className,
  additionalFooter,
}: SteppedFormProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep && onSubmit) {
      onSubmit();
    } else if (onNext) {
      onNext();
    }
  };

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious();
    }
  };

  return (
    <div className={cn("auth-bg min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 hide-scrollbar", className)}>
      <Card className="w-full max-w-lg glass-card border-0 animate-scale-in max-h-[80vh] overflow-y-auto hide-scrollbar">
        <CardHeader className="text-center space-y-4">
          {icon && (
            <div className="flex items-center justify-center animate-glow">
              {icon}
            </div>
          )}
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="text-base">
                {description}
              </CardDescription>
            )}
          </div>
          
          <StepIndicator
            steps={steps.map(step => step.title)}
            currentStep={currentStep}
            className="px-2"
          />
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="min-h-[200px] max-h-60 overflow-y-auto py-2 hide-scrollbar">
            <div
              key={currentStep}
              className="animate-fade-in"
            >
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="font-semibold text-lg">
                    {steps[currentStep].title}
                  </h3>
                  {steps[currentStep].description && (
                    <p className="text-sm text-muted-foreground">
                      {steps[currentStep].description}
                    </p>
                  )}
                </div>

                <div className="animate-slide-up">
                  {steps[currentStep].content}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={isFirstStep || isLoading}
                className={cn(
                  "hover-lift transition-all duration-200",
                  isFirstStep && "invisible"
                )}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceed || isLoading}
                className="button-glow hover-lift transition-all duration-200 px-8"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </div>
                ) : (
                  <>
                    {isLastStep ? "Complete" : "Next"}
                    {!isLastStep && <ChevronRight className="w-4 h-4 ml-2" />}
                  </>
                )}
              </Button>
            </div>

            {additionalFooter && (
              <div className="mt-4">
                {additionalFooter}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}