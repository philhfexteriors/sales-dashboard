'use client'

import { usePlanForm } from '@/components/PlanFormProvider'

const SECTIONS = [
  { key: 'has_roof' as const, label: 'Roof', description: 'Shingles, flashing, ventilation, skylights', icon: '🏠' },
  { key: 'has_siding' as const, label: 'Siding', description: 'Siding, fascia, soffit, corners, blocks', icon: '🧱' },
  { key: 'has_guttering' as const, label: 'Guttering', description: 'Gutters and gutter guards', icon: '🔧' },
  { key: 'has_windows' as const, label: 'Windows', description: 'Window replacement and installation', icon: '🪟' },
  { key: 'has_small_jobs' as const, label: 'Small Jobs', description: 'Minor repairs and miscellaneous work', icon: '🔨' },
]

export default function SectionPickerStep() {
  const { plan, updatePlan } = usePlanForm()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Select Sections</h2>
        <p className="text-sm text-gray-500">Choose which types of work this production plan covers.</p>
      </div>

      <div className="grid gap-3">
        {SECTIONS.map(section => {
          const isActive = plan[section.key]
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => updatePlan({ [section.key]: !isActive })}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                isActive
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className="text-2xl">{section.icon}</span>
              <div className="flex-1">
                <h3 className={`font-semibold ${isActive ? 'text-primary' : 'text-gray-900'}`}>
                  {section.label}
                </h3>
                <p className="text-sm text-gray-500">{section.description}</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                isActive ? 'border-primary bg-primary' : 'border-gray-300'
              }`}>
                {isActive && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {!plan.has_roof && !plan.has_siding && !plan.has_guttering && !plan.has_windows && !plan.has_small_jobs && (
        <p className="text-sm text-yellow-600 bg-yellow-50 px-4 py-3 rounded-lg">
          Select at least one section to continue.
        </p>
      )}
    </div>
  )
}
