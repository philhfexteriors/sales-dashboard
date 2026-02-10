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
}

export default function StepNavigation({
  steps,
  currentStep,
  onStepChange,
  onSave,
  saving,
  dirty,
}: StepNavigationProps) {
  return (
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
            onClick={() => onStepChange(i)}
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

      {/* Nav buttons */}
      <div className="flex justify-between px-4 pb-3">
        <button
          onClick={() => onStepChange(currentStep - 1)}
          disabled={currentStep === 0}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>
        <button
          onClick={() => onStepChange(currentStep + 1)}
          disabled={currentStep >= steps.length - 1}
          className="px-4 py-2 text-sm font-medium text-primary hover:text-primary-dark disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
