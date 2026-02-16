'use client'

import { useBidForm } from '@/components/BidFormProvider'

const TRADES = [
  { key: 'roof', label: 'Roofing', desc: 'Shingles, underlayment, ridge caps, flashing' },
  { key: 'siding', label: 'Siding', desc: 'Vinyl, Hardie, LP SmartSide panels & accessories' },
  { key: 'gutters', label: 'Gutters', desc: 'Gutters, downspouts, guards' },
  { key: 'windows', label: 'Windows', desc: 'Window replacement & installation' },
  { key: 'fascia_soffit', label: 'Fascia & Soffit', desc: 'Fascia boards, soffit panels, trim' },
]

const MATERIAL_VARIANTS = [
  { key: 'vinyl', label: 'Vinyl Siding' },
  { key: 'hardie', label: 'James Hardie Board' },
  { key: 'lp_smartside', label: 'LP SmartSide' },
]

const LABOR_DIFFICULTIES = [
  { key: 'standard', label: 'Standard' },
  { key: 'moderate', label: 'Moderate' },
  { key: 'difficult', label: 'Difficult' },
]

const ROOF_COMPLEXITY = [
  { waste: 10, label: 'Simple Gable (10% waste)' },
  { waste: 15, label: 'Hip or Cut Up (15% waste)' },
  { waste: 20, label: 'Very Complex (20% waste)' },
]

export default function BidTradeStep() {
  const { bid, updateBid } = useBidForm()

  const showSidingOptions = bid.trade === 'siding' || bid.trade === 'fascia_soffit'
  const showRoofOptions = bid.trade === 'roof'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Trade & Configuration</h2>
        <p className="text-sm text-gray-500">Select the trade and configure bid parameters.</p>
      </div>

      {/* Trade selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Trade</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TRADES.map(trade => (
            <button
              key={trade.key}
              onClick={() => updateBid({ trade: trade.key })}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                bid.trade === trade.key
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-medium text-gray-900">{trade.label}</p>
              <p className="text-xs text-gray-500 mt-1">{trade.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Material variant (siding/fascia) */}
      {showSidingOptions && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Material Variant</label>
          <div className="flex flex-wrap gap-2">
            {MATERIAL_VARIANTS.map(v => (
              <button
                key={v.key}
                onClick={() => updateBid({ material_variant: v.key })}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  bid.material_variant === v.key
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Roof complexity / waste */}
      {showRoofOptions && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Roof Complexity</label>
          <div className="flex flex-wrap gap-2">
            {ROOF_COMPLEXITY.map(c => (
              <button
                key={c.waste}
                onClick={() => updateBid({ waste_pct_roof: c.waste })}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  bid.waste_pct_roof === c.waste
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Configuration grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Pitch */}
        {(bid.trade === 'roof' || bid.trade === 'siding') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pitch</label>
            <select
              value={bid.pitch || ''}
              onChange={e => updateBid({ pitch: e.target.value || null })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm"
            >
              <option value="">Select pitch...</option>
              {['4/12', '5/12', '6/12', '7/12', '8/12', '9/12', '10/12', '11/12', '12/12', '13/12+'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}

        {/* Stories */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stories</label>
          <select
            value={bid.stories}
            onChange={e => updateBid({ stories: parseInt(e.target.value) })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm"
          >
            <option value={1}>1 Story</option>
            <option value={2}>2 Stories</option>
            <option value={3}>3 Stories</option>
          </select>
        </div>

        {/* Labor Difficulty */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Labor Difficulty</label>
          <select
            value={bid.labor_difficulty || 'standard'}
            onChange={e => updateBid({ labor_difficulty: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm"
          >
            {LABOR_DIFFICULTIES.map(d => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
        </div>

        {/* Default Margin */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Margin %</label>
          <input
            type="number"
            step="0.5"
            min="0"
            max="100"
            value={bid.default_margin_pct}
            onChange={e => updateBid({ default_margin_pct: parseFloat(e.target.value) || 30 })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm"
          />
        </div>

        {/* Tax Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate %</label>
          <input
            type="number"
            step="0.125"
            min="0"
            max="20"
            value={bid.tax_rate}
            onChange={e => updateBid({ tax_rate: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm"
          />
        </div>

        {/* Siding waste % */}
        {showSidingOptions && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Siding Waste %</label>
            <input
              type="number"
              step="1"
              min="0"
              max="50"
              value={bid.waste_pct_siding}
              onChange={e => updateBid({ waste_pct_siding: parseFloat(e.target.value) || 30 })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm"
            />
          </div>
        )}
      </div>
    </div>
  )
}
