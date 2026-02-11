'use client'

interface Step {
  key: string
  label: string
}

interface StepNavigationProps {
  steps: Step[]
  currentStep: number
  onStepChange: (step: number) => void
  onSave?: () => void
  saving?: boolean
  dirty?: boolean
  canAdvance?: boolean
  onAttemptAdvance?: () => void
}

export default function StepNavigation({
  steps,
  currentStep,
  onStepChange,
  onSave,
  saving,
  dirty,
  canAdvance = true,
  onAttemptAdvance,
}: StepNavigationProps) {
  const isLastStep = currentStep >= steps.length - 1

  function handleNext() {
    if (!canAdvance) {
      onAttemptAdvance?.()
      return
    }
    onStepChange(currentStep + 1)
  }

  return (
    <>
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Step indicators - scrollable on mobile */}
        <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
          {steps.map((step, i) => (
            <button
              key={step.key}
              onClick={() => {
                if (i < currentStep) {
                  onStepChange(i)
                } else if (i > currentStep) {
                  if (!canAdvance) {
                    onAttemptAdvance?.()
                  } else {
                    onStepChange(i)
                  }
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                i === currentStep
                  ? 'bg-primary/10 text-primary'
                  : i < currentStep
                  ? 'text-accent'
                  : 'text-gray-400'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                i === currentStep
                  ? 'bg-primary text-white'
                  : i < currentStep
                  ? 'bg-accent text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {i < currentStep ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          ))}

          {/* Save indicator */}
          <div className="ml-auto flex items-center gap-2">
            {saving && <span className="text-xs text-gray-400">Saving...</span>}
            {dirty && !saving && <span className="text-xs text-yellow-500">Unsaved</span>}
            {!dirty && !saving && <span className="text-xs text-green-500">Saved</span>}
            {onSave && (
              <button
                onClick={onSave}
                disabled={saving}
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 disabled:opacity-50"
              >
                Save
              </button>
            )}
          </div>
        </div>

        {/* Previous button in header */}
        <div className="flex justify-start px-4 pb-3">
          <button
            onClick={() => onStepChange(currentStep - 1)}
            disabled={currentStep === 0}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
        </div>
      </div>

      {/* Sticky Next button */}
      {!isLastStep && (
        <div className="fixed bottom-0 left-0 right-0 z-50 sm:bottom-6 sm:left-auto sm:right-6">
          <div className="bg-white border-t border-gray-200 p-3 sm:border-t-0 sm:bg-transparent sm:p-0">
            <button
              onClick={handleNext}
              className={`w-full sm:w-auto px-8 py-3 text-sm font-semibold rounded-xl shadow-lg transition-all ${
                canAdvance
                  ? 'bg-primary text-white hover:bg-primary-dark hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </>
  )
}
