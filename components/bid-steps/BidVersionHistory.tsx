'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'

interface Version {
  id: string
  version_number: number
  status: string
  materials_total: number
  labor_total: number
  tax_total: number
  grand_total: number
  margin_total: number
  notes: string | null
  created_at: string
}

interface BidVersionHistoryProps {
  bidId: string
  currentVersionId?: string
  onSelectVersion?: (versionId: string) => void
}

const statusColors: Record<string, string> = {
  draft: 'text-yellow-700 bg-yellow-50',
  sent: 'text-blue-700 bg-blue-50',
  superseded: 'text-gray-500 bg-gray-50',
}

export default function BidVersionHistory({ bidId, currentVersionId, onSelectVersion }: BidVersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/bids/${bidId}/versions`)
      .then(r => r.json())
      .then(data => {
        setVersions(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [bidId])

  if (loading) {
    return (
      <div className="text-sm text-gray-400 py-4 text-center">Loading versions...</div>
    )
  }

  if (versions.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Version History</h3>
      <div className="space-y-0">
        {versions.map((v, idx) => {
          const isCurrent = v.id === currentVersionId || (!currentVersionId && v.status !== 'superseded')
          const isClickable = !!onSelectVersion && !isCurrent

          return (
            <div key={v.id} className="relative flex gap-3">
              {/* Timeline line */}
              {idx < versions.length - 1 && (
                <div className="absolute left-[7px] top-5 bottom-0 w-px bg-gray-200" />
              )}

              {/* Timeline dot */}
              <div className="relative z-10 mt-1 flex-shrink-0">
                <div className={`w-[15px] h-[15px] rounded-full border-2 ${
                  isCurrent
                    ? 'bg-primary border-primary'
                    : 'bg-white border-gray-300'
                }`} />
              </div>

              {/* Version content */}
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onSelectVersion!(v.id)}
                className={`flex-1 text-left pb-4 ${isClickable ? 'cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isCurrent ? 'text-primary' : 'text-gray-700'}`}>
                    v{v.version_number}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColors[v.status] || statusColors.draft}`}>
                    {isCurrent ? 'current' : v.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {format(new Date(v.created_at), 'MMM d, yyyy h:mm a')}
                </div>
                <div className="text-sm font-medium text-gray-900 mt-1">
                  ${v.grand_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                {v.notes && (
                  <div className="text-xs text-gray-500 mt-0.5 italic">{v.notes}</div>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
