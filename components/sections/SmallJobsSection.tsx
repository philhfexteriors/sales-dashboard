'use client'

import { CustomLineItems } from './SectionField'

export default function SmallJobsSection() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Small Jobs</h2>
        <p className="text-sm text-gray-500">Add small jobs and minor repair items.</p>
      </div>

      <CustomLineItems section="small_jobs" />
    </div>
  )
}
