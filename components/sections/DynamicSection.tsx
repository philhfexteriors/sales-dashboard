'use client'

import { useEffect, useState } from 'react'
import DynamicField, { type CategoryField } from '@/components/fields/DynamicField'
import { CustomLineItems } from './SectionField'

const SECTION_LABELS: Record<string, { title: string; description: string }> = {
  roof: { title: 'Roof', description: 'Configure all roofing details.' },
  siding: { title: 'Siding', description: 'Configure siding, fascia, soffit, and related items.' },
  guttering: { title: 'Guttering', description: 'Configure gutters and gutter guards.' },
  windows: { title: 'Windows', description: 'Add window items with descriptions and pricing.' },
  small_jobs: { title: 'Small Jobs', description: 'Add small jobs and minor repair items.' },
}

interface DynamicSectionProps {
  section: string
}

export default function DynamicSection({ section }: DynamicSectionProps) {
  const [categories, setCategories] = useState<CategoryField[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/products/categories?section=${section}&active=true`)
      .then(r => r.json())
      .then((data: CategoryField[]) => {
        // Only show categories that have a field_key (data-driven fields)
        setCategories((data || []).filter(c => c.field_key))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [section])

  const labels = SECTION_LABELS[section] || { title: section, description: '' }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{labels.title}</h2>
        <p className="text-sm text-gray-500">{labels.description}</p>
      </div>

      {loading ? (
        <div className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-gray-400 mt-2">Loading fields...</p>
        </div>
      ) : categories.length === 0 ? (
        // No configured fields — just show custom line items
        <></>
      ) : (
        categories.map(cat => (
          <DynamicField
            key={cat.id}
            category={cat}
            section={section}
          />
        ))
      )}

      {/* Custom line items always available at the bottom */}
      <h3 className="font-medium text-gray-700 mt-6">Additional Items</h3>
      <CustomLineItems section={section} />
    </div>
  )
}
