'use client'

import { use, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { BidFormProvider, useBidForm } from '@/components/BidFormProvider'
import StepNavigation from '@/components/StepNavigation'
import Loading from '@/components/Loading'
import BidClientStep from '@/components/bid-steps/BidClientStep'
import BidTradeStep from '@/components/bid-steps/BidTradeStep'
import BidHoverStep from '@/components/bid-steps/BidHoverStep'
import BidMeasurementsStep from '@/components/bid-steps/BidMeasurementsStep'
import BidLineItemsStep from '@/components/bid-steps/BidLineItemsStep'
import BidReviewStep from '@/components/bid-steps/BidReviewStep'

const STEPS = [
  { key: 'client', label: 'Client' },
  { key: 'trade', label: 'Trade & Config' },
  { key: 'hover', label: 'Hover Match' },
  { key: 'measurements', label: 'Measurements' },
  { key: 'lineitems', label: 'Line Items' },
  { key: 'review', label: 'Review' },
]

export default function EditBid({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <AppShell>
      <BidFormProvider bidId={id}>
        <BidEditor />
      </BidFormProvider>
    </AppShell>
  )
}

function BidEditor() {
  const { loading, saving, dirty, saveNow } = useBidForm()
  const searchParams = useSearchParams()
  const initialStep = searchParams.get('hover') === 'connected' ? 2 : 0
  const [currentStep, setCurrentStep] = useState(initialStep)

  if (loading) {
    return <div className="py-20"><Loading message="Loading bid..." size="lg" /></div>
  }

  const currentStepKey = STEPS[currentStep]?.key

  function handleStepChange(step: number) {
    if (step >= 0 && step < STEPS.length) {
      setCurrentStep(step)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen">
      <StepNavigation
        steps={STEPS}
        currentStep={currentStep}
        onStepChange={handleStepChange}
        onSave={saveNow}
        saving={saving}
        dirty={dirty}
        canAdvance={true}
        onAttemptAdvance={() => {}}
      />

      <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24">
        {currentStepKey === 'client' && <BidClientStep />}
        {currentStepKey === 'trade' && <BidTradeStep />}
        {currentStepKey === 'hover' && <BidHoverStep />}
        {currentStepKey === 'measurements' && <BidMeasurementsStep />}
        {currentStepKey === 'lineitems' && <BidLineItemsStep />}
        {currentStepKey === 'review' && <BidReviewStep />}
      </div>
    </div>
  )
}
