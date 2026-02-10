'use client'

import { CustomLineItems } from './SectionField'

export default function WindowsSection() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Windows</h2>
        <p className="text-sm text-gray-500">Add window items with descriptions and pricing.</p>
      </div>

      <CustomLineItems section="windows" />
    </div>
  )
}
