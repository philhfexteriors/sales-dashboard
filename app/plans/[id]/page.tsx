'use client'

import { use } from 'react'
import { redirect } from 'next/navigation'

export default function ViewPlan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  // For now, redirect to review page. Full read-only view coming in Phase 7.
  redirect(`/plans/${id}/review`)
}
