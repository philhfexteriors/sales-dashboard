'use client'

import { useState, useEffect } from 'react'
import { useBidForm } from '@/components/BidFormProvider'
import { parseFacadeData, parseHoverWindows } from '@/lib/services/hoverTypes'
import type { HoverMeasurements } from '@/lib/services/hoverTypes'
import { applyTemplate, type TemplateData } from '@/lib/services/templateApplicator'
import toast from 'react-hot-toast'

export default function BidMeasurementsStep() {
  const { bid, updateBid, setLineItems } = useBidForm()
  const [loading, setLoading] = useState(false)
  const [measurements, setMeasurements] = useState<HoverMeasurements | null>(
    bid.measurements_json as HoverMeasurements | null
  )
  const [templateData, setTemplateData] = useState<TemplateData | null>(null)
  const [applyingTemplate, setApplyingTemplate] = useState(false)

  // Fetch full template when template_id is set
  useEffect(() => {
    if (!bid.template_id) {
      setTemplateData(null)
      return
    }
    fetch(`/api/bid-templates/${bid.template_id}`)
      .then(r => r.json())
      .then(data => setTemplateData(data))
      .catch(() => setTemplateData(null))
  }, [bid.template_id])

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

  const trade = bid.trade

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Measurements</h2>
        <p className="text-sm text-gray-500">
          Pull measurement data from Hover to auto-calculate {trade} quantities.
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

      {/* Measurement display — filtered by trade */}
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

          {/* Summary address */}
          {measurements.summary && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-700">
                {measurements.summary.address}
              </p>
            </div>
          )}

          {/* Roof measurements */}
          {trade === 'roof' && (
            <RoofMeasurements measurements={measurements} />
          )}

          {/* Siding measurements */}
          {(trade === 'siding' || trade === 'fascia_soffit') && (
            <SidingMeasurements measurements={measurements} />
          )}

          {/* Gutter measurements */}
          {trade === 'gutters' && (
            <GutterMeasurements measurements={measurements} />
          )}

          {/* Window measurements */}
          {trade === 'windows' && (
            <WindowMeasurements measurements={measurements} />
          )}

          <p className="text-xs text-gray-400">
            These measurements will be used to auto-calculate bid quantities in the next step.
            You can always adjust quantities manually.
          </p>

          {/* Apply Template card */}
          {templateData && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">
                    Template: {templateData.name}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {templateData.bid_template_items.length} items will be auto-calculated from measurements
                    with {getWastePct()}% waste factor
                  </p>
                </div>
                <button
                  onClick={handleApplyTemplate}
                  disabled={applyingTemplate}
                  className="px-5 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 shrink-0"
                >
                  {applyingTemplate ? 'Applying...' : 'Apply Template & Calculate'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                This will replace any existing line items with template-calculated quantities.
              </p>
            </div>
          )}

          {/* No template but measurements available */}
          {!templateData && bid.template_id === null && (
            <p className="text-xs text-gray-400">
              No template selected. You can select a template in the Trade step to auto-calculate quantities.
            </p>
          )}
        </div>
      )}
    </div>
  )

  function getWastePct(): number {
    if (bid.trade === 'roof') return bid.waste_pct_roof
    if (bid.trade === 'siding' || bid.trade === 'fascia_soffit') return bid.waste_pct_siding
    return templateData?.waste_pct ?? 10
  }

  function handleApplyTemplate() {
    if (!templateData) return
    setApplyingTemplate(true)
    try {
      const wastePct = getWastePct()
      const lineItems = applyTemplate(
        templateData,
        measurements,
        {
          wastePct,
          defaultMarginPct: bid.default_margin_pct,
          materialVariant: bid.material_variant,
        }
      )
      setLineItems(lineItems)
      toast.success(`Template applied — ${lineItems.length} items calculated`)
    } catch (err) {
      console.error('Template application error:', err)
      toast.error('Failed to apply template')
    }
    setApplyingTemplate(false)
  }
}

function RoofMeasurements({ measurements }: { measurements: HoverMeasurements }) {
  // Extract roof data if available (from roof key or summary)
  const roofData = measurements.roof as Record<string, unknown> | undefined

  return (
    <div className="space-y-3">
      {roofData ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Roof Measurements</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {roofData.total_area != null && (
              <MeasurementValue label="Total Area" value={`${Math.round(roofData.total_area as number)} sq ft`} />
            )}
            {roofData.ridges != null && (
              <MeasurementValue label="Ridges" value={`${Math.round(roofData.ridges as number)} ft`} />
            )}
            {roofData.hips != null && (
              <MeasurementValue label="Hips" value={`${Math.round(roofData.hips as number)} ft`} />
            )}
            {roofData.valleys != null && (
              <MeasurementValue label="Valleys" value={`${Math.round(roofData.valleys as number)} ft`} />
            )}
            {roofData.rakes != null && (
              <MeasurementValue label="Rakes" value={`${Math.round(roofData.rakes as number)} ft`} />
            )}
            {roofData.eaves != null && (
              <MeasurementValue label="Eaves" value={`${Math.round(roofData.eaves as number)} ft`} />
            )}
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            Roof-specific measurements not available from Hover for this model.
            Quantities can be entered manually in the next step.
          </p>
        </div>
      )}
    </div>
  )
}

function SidingMeasurements({ measurements }: { measurements: HoverMeasurements }) {
  const facades = measurements.facades ? parseFacadeData(measurements) : []
  const totalSidingArea = facades.reduce((sum, f) => sum + f.totalArea, 0)

  return (
    <div className="space-y-3">
      {/* Facades */}
      {facades.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Facades</h4>
          <div className="space-y-2">
            {facades.map((facade, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{facade.materialType}</span>
                <div className="flex gap-4 text-gray-900">
                  <span>{Math.round(facade.totalArea)} sq ft</span>
                  <span>{facade.facadeCount} facades</span>
                  <span>{facade.totalOpenings} openings</span>
                </div>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between text-sm font-medium">
              <span className="text-gray-700">Total Siding Area</span>
              <span className="text-gray-900">{Math.round(totalSidingArea)} sq ft</span>
            </div>
          </div>
        </div>
      )}

      {/* Openings (relevant for siding — need to cut around them) */}
      {measurements.openings && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Openings</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <MeasurementValue label="Windows" value={String(measurements.openings.windows.length)} />
            <MeasurementValue label="Doors" value={String(measurements.openings.doors.length)} />
          </div>
        </div>
      )}
    </div>
  )
}

function GutterMeasurements({ measurements }: { measurements: HoverMeasurements }) {
  // Gutter data comes from eaves in roof measurements
  const roofData = measurements.roof as Record<string, unknown> | undefined

  return (
    <div className="space-y-3">
      {roofData?.eaves != null ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Gutter Measurements</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <MeasurementValue label="Eaves (Gutter Run)" value={`${Math.round(roofData.eaves as number)} ft`} />
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            Gutter measurements (eaves) not available from Hover for this model.
            Quantities can be entered manually in the next step.
          </p>
        </div>
      )}
    </div>
  )
}

function WindowMeasurements({ measurements }: { measurements: HoverMeasurements }) {
  const windows = measurements.openings ? parseHoverWindows(measurements) : []

  return (
    <div className="space-y-3">
      {windows.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Windows ({windows.length})</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {windows.map((w, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                <div>
                  <span className="font-medium text-gray-900">{w.label}</span>
                  <span className="text-gray-400 ml-2">{w.groupName}</span>
                </div>
                <div className="flex gap-3 text-gray-600">
                  <span>{w.roundedWidth}&quot; x {w.roundedHeight}&quot;</span>
                  <span>{w.unitedInches} UI</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            No window data available from Hover for this model.
          </p>
        </div>
      )}

      {/* Also show doors */}
      {measurements.openings?.doors && measurements.openings.doors.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Doors ({measurements.openings.doors.length})</h4>
          <div className="space-y-2">
            {measurements.openings.doors.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900">{d.opening}</span>
                <span className="text-gray-600">{d.width_x_height}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MeasurementValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-500">{label}:</span>
      <span className="ml-2 font-medium text-gray-900">{value}</span>
    </div>
  )
}
