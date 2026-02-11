'use client'

import { use, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { PlanFormProvider, usePlanForm } from '@/components/PlanFormProvider'
import StepNavigation from '@/components/StepNavigation'
import Loading from '@/components/Loading'
import ClientInfoStep, { useClientInfoValidation } from '@/components/steps/ClientInfoStep'
import SectionPickerStep from '@/components/steps/SectionPickerStep'
import DynamicSection from '@/components/sections/DynamicSection'
import PricingSummary from '@/components/steps/PricingSummary'
import toast from 'react-hot-toast'

export default function EditPlan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <AppShell>
      <PlanFormProvider planId={id}>
        <PlanEditor />
      </PlanFormProvider>
    </AppShell>
  )
}

function PlanEditor() {
  const { plan, loading, saving, dirty, saveNow } = usePlanForm()
  const [currentStep, setCurrentStep] = useState(0)
  const [showClientErrors, setShowClientErrors] = useState(false)

  const clientValidation = useClientInfoValidation(plan)

  const steps = useMemo(() => {
    const s = [
      { key: 'client', label: 'Client Info' },
      { key: 'sections', label: 'Sections' },
    ]

    if (plan.has_roof) s.push({ key: 'roof', label: 'Roof' })
    if (plan.has_siding) s.push({ key: 'siding', label: 'Siding' })
    if (plan.has_guttering) s.push({ key: 'guttering', label: 'Guttering' })
    if (plan.has_windows) s.push({ key: 'windows', label: 'Windows' })
    if (plan.has_small_jobs) s.push({ key: 'small_jobs', label: 'Small Jobs' })

    s.push({ key: 'pricing', label: 'Pricing & Review' })

    return s
  }, [plan.has_roof, plan.has_siding, plan.has_guttering, plan.has_windows, plan.has_small_jobs])

  if (loading) {
    return <div className="py-20"><Loading message="Loading plan..." size="lg" /></div>
  }

  const currentStepKey = steps[currentStep]?.key

  // Section keys that use DynamicSection
  const sectionKeys = ['roof', 'siding', 'guttering', 'windows', 'small_jobs']

  // Determine if user can advance from current step
  const canAdvance = (() => {
    if (currentStepKey === 'client') {
      return clientValidation.isValid
    }
    if (currentStepKey === 'sections') {
      return plan.has_roof || plan.has_siding || plan.has_guttering || plan.has_windows || plan.has_small_jobs
    }
    return true
  })()

  function handleAttemptAdvance() {
    if (currentStepKey === 'client') {
      setShowClientErrors(true)
      if (clientValidation.firstInvalidField) {
        ClientInfoStep.focusFirstInvalid(clientValidation.firstInvalidField)
        toast.error('Please fill in all required fields')
      }
    }
    if (currentStepKey === 'sections') {
      toast.error('Select at least one section to continue')
    }
  }

  function handleStepChange(step: number) {
    if (step >= 0 && step < steps.length) {
      // If going forward and can't advance, block
      if (step > currentStep && !canAdvance) {
        handleAttemptAdvance()
        return
      }
      // Clear error states when leaving a step
      if (currentStepKey === 'client' && step !== currentStep) {
        setShowClientErrors(false)
      }
      setCurrentStep(step)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen">
      <StepNavigation
        steps={steps}
        currentStep={currentStep}
        onStepChange={handleStepChange}
        onSave={saveNow}
        saving={saving}
        dirty={dirty}
        canAdvance={canAdvance}
        onAttemptAdvance={handleAttemptAdvance}
      />

      <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24">
        {currentStepKey === 'client' && <ClientInfoStep showErrors={showClientErrors} />}
        {currentStepKey === 'sections' && <SectionPickerStep />}
        {currentStepKey && sectionKeys.includes(currentStepKey) && (
          <DynamicSection section={currentStepKey} />
        )}
        {currentStepKey === 'pricing' && <PricingSummary />}
      </div>
    </div>
  )
}
