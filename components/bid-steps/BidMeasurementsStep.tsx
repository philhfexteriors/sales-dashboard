'use client'

import { useState } from 'react'
import { useBidForm } from '@/components/BidFormProvider'
import { parseFacadeData } from '@/lib/services/hoverTypes'
import type { HoverMeasurements } from '@/lib/services/hoverTypes'
import toast from 'react-hot-toast'

export default function BidMeasurementsStep() {
  const { bid, updateBid } = useBidForm()
  const [loading, setLoading] = useState(false)
  const [measurements, setMeasurements] = useState<HoverMeasurements | null>(
    bid.measurements_json as HoverMeasurements | null
  )

  async function fetchMeasurements() {
    if (!bid.hover_model_id) {
      toast.error('No Hover model selected')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/hover/measurements/${bid.hover_model_id}`)
      if (res.ok) {
        const data = await res.json()
        setMeasurements(data)
        updateBid({ measurements_json: data })
        toast.success('Measurements imported')
      } else {
        toast.error('Failed to fetch measurements')
      }
    } catch {
      toast.error('Failed to fetch measurements')
    }
    setLoading(false)
  }

  if (!bid.hover_job_id) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Measurements</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
          <p className="text-gray-500 mb-2">No Hover job selected.</p>
          <p className="text-sm text-gray-400">
            You can go back and select a Hover job, or skip to line items and enter quantities manually.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Measurements</h2>
        <p className="text-sm text-gray-500">
          Pull measurement data from Hover to auto-calculate quantities.
        </p>
      </div>

      {/* Fetch button */}
      {!measurements && (
        <button
          onClick={fetchMeasurements}
          disabled={loading}
          className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {loading ? 'Fetching...' : 'Import Measurements from Hover'}
        </button>
      )}

      {/* Measurement display */}
      {measurements && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Measurement Data</h3>
            <button
              onClick={fetchMeasurements}
              disabled={loading}
              className="text-sm text-primary font-medium"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* Summary */}
          {measurements.summary && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-700">
                {measurements.summary.address}
              </p>
            </div>
          )}

          {/* Facades */}
          {measurements.facades && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Facades</h4>
              <div className="space-y-2">
                {parseFacadeData(measurements).map((facade, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{facade.materialType}</span>
                    <div className="flex gap-4 text-gray-900">
                      <span>{Math.round(facade.totalArea)} sq ft</span>
                      <span>{facade.facadeCount} facades</span>
                      <span>{facade.totalOpenings} openings</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Windows */}
          {measurements.openings && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Openings</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Windows:</span>
                  <span className="ml-2 font-medium">{measurements.openings.windows.length}</span>
                </div>
                <div>
                  <span className="text-gray-500">Doors:</span>
                  <span className="ml-2 font-medium">{measurements.openings.doors.length}</span>
                </div>
                <div>
                  <span className="text-gray-500">Window Groups:</span>
                  <span className="ml-2 font-medium">{measurements.openings.window_groups.length}</span>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400">
            These measurements will be used to auto-calculate bid quantities in the next step.
            You can always adjust quantities manually.
          </p>
        </div>
      )}
    </div>
  )
}
