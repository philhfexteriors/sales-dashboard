'use client'

import { useEffect, useState } from 'react'
import { usePlanForm } from '@/components/PlanFormProvider'
import SectionField, { CustomLineItems } from './SectionField'
import CascadeSelect from '@/components/fields/CascadeSelect'
import RadioGroup from '@/components/fields/RadioGroup'
import CheckboxGroup from '@/components/fields/CheckboxGroup'
import CountInput from '@/components/fields/CountInput'
import ManagedSelect from '@/components/fields/ManagedSelect'

interface Category { id: string; name: string; section: string }
interface WarrantyTier { id: string; name: string; shingle_line_id: string }

export default function RoofSection() {
  const { getLineItem, updateLineItem } = usePlanForm()
  const [categories, setCategories] = useState<Category[]>([])
  const [warrantyTiers, setWarrantyTiers] = useState<WarrantyTier[]>([])

  useEffect(() => {
    fetch('/api/products/categories')
      .then(r => r.json())
      .then(data => setCategories((data || []).filter((c: Category) => c.section === 'roof')))
  }, [])

  const getCategoryId = (name: string) => categories.find(c => c.name.toLowerCase().includes(name.toLowerCase()))?.id

  const shinglesCatId = getCategoryId('shingle')
  const ventCatId = getCategoryId('ventilat')
  const pipeBootsCatId = getCategoryId('pipe')
  const dripEdgeCatId = getCategoryId('drip')

  // Shingles
  const shingles = getLineItem('shingles', 'roof')
  const shingleSelections = (shingles?.selections || {}) as Record<string, string>
  // The "line" level selection has an ID stored as line_id by CascadeSelect
  const shingleLineId = shingleSelections.line_id || null

  // Fetch warranty tiers when shingle line changes
  useEffect(() => {
    if (!shingleLineId) {
      setWarrantyTiers([])
      return
    }
    fetch(`/api/warranty-tiers?shingle_line_id=${shingleLineId}`)
      .then(r => r.json())
      .then(data => setWarrantyTiers(data || []))
  }, [shingleLineId])

  // Load
  const load = getLineItem('load', 'roof')
  const loadType = (load?.options as Record<string, string>)?.load_type || null

  // Ext Layers
  const extLayers = getLineItem('ext_layers', 'roof')
  const extOptions = (extLayers?.options || {}) as Record<string, number>

  // Ice & Water
  const iceWater = getLineItem('ice_water', 'roof')
  const iceOptions = (iceWater?.options || {}) as Record<string, boolean>
  const selectedIce = Object.entries(iceOptions).filter(([, v]) => v).map(([k]) => k)

  // Skylights
  const skylights = getLineItem('skylights', 'roof')
  const skyOptions = (skylights?.options || {}) as Record<string, unknown>

  // Chimney Flashing
  const chimneyFlashing = getLineItem('chimney_flashing', 'roof')
  const chimneyOptions = (chimneyFlashing?.options || {}) as Record<string, unknown>
  const chimneyTypes = ((chimneyOptions.types as string[]) || [])

  // Roof to Wall Flashing
  const roofWallFlashing = getLineItem('roof_wall_flashing', 'roof')
  const roofWallOptions = (roofWallFlashing?.options || {}) as Record<string, unknown>
  const roofWallTypes = ((roofWallOptions.types as string[]) || [])

  // Satellite
  const satellite = getLineItem('satellite', 'roof')
  const satType = (satellite?.options as Record<string, string>)?.type || null

  // Warranty
  const warranty = getLineItem('warranty', 'roof')
  const warrantyValue = (warranty?.options as Record<string, string>)?.tier || ''

  const flashingTypeOptions = [
    { value: 'siding', label: 'Siding' },
    { value: 'brick', label: 'Brick' },
    { value: 'custom_cut', label: 'Custom Cut' },
    { value: 'groove_in', label: 'Groove-in' },
    { value: 'pre_bent', label: 'Pre Bent' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Roof</h2>
        <p className="text-sm text-gray-500">Configure all roofing details.</p>
      </div>

      {/* Shingles */}
      <SectionField section="roof" fieldKey="shingles" label="Shingles">
        {shinglesCatId ? (
          <CascadeSelect
            categoryId={shinglesCatId}
            value={shingleSelections}
            onChange={val => updateLineItem('shingles', 'roof', { selections: val })}
            labels={['Brand', 'Line', 'Color']}
          />
        ) : (
          <p className="text-sm text-gray-400">Set up Shingles category in admin to enable selection</p>
        )}
      </SectionField>

      {/* Load */}
      <SectionField section="roof" fieldKey="load" label="Load">
        <RadioGroup
          options={[
            { value: 'roof', label: 'Roof' },
            { value: 'ground', label: 'Ground' },
          ]}
          selected={loadType}
          onChange={val => updateLineItem('load', 'roof', { options: { load_type: val } })}
        />
      </SectionField>

      {/* Ext Layers */}
      <SectionField section="roof" fieldKey="ext_layers" label="Existing Layers">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1"># Layers</label>
            <select
              value={extOptions.layers || ''}
              onChange={e => updateLineItem('ext_layers', 'roof', {
                options: { ...extOptions, layers: parseInt(e.target.value) || 0 }
              })}
              className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
            >
              <option value="">Select</option>
              <option value="1">1 Layer</option>
              <option value="2">2 Layers</option>
              <option value="3">3 Layers</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Total Sq Ft</label>
            <input
              type="number"
              inputMode="numeric"
              value={extOptions.total_sq || ''}
              onChange={e => updateLineItem('ext_layers', 'roof', {
                options: { ...extOptions, total_sq: parseInt(e.target.value) || 0 }
              })}
              placeholder="0"
              className="w-28 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </SectionField>

      {/* Ice & Water */}
      <SectionField section="roof" fieldKey="ice_water" label="Ice & Water">
        <CheckboxGroup
          options={[
            { value: 'eaves', label: 'Eaves' },
            { value: 'valleys', label: 'Valleys' },
          ]}
          selected={selectedIce}
          onChange={vals => {
            const opts: Record<string, boolean> = {}
            vals.forEach(v => opts[v] = true)
            updateLineItem('ice_water', 'roof', { options: opts })
          }}
        />
      </SectionField>

      {/* Skylights */}
      <SectionField section="roof" fieldKey="skylights" label="Skylights">
        <div className="space-y-3">
          <CountInput
            value={(skyOptions.count as number) || 0}
            onChange={val => updateLineItem('skylights', 'roof', {
              options: { ...skyOptions, count: val }
            })}
            label="Count"
          />
          {(skyOptions.count as number) > 0 && (
            <RadioGroup
              options={[
                { value: 'flash', label: 'Flash' },
                { value: 'replace', label: 'Replace' },
              ]}
              selected={(skyOptions.action as string) || null}
              onChange={val => updateLineItem('skylights', 'roof', {
                options: { ...skyOptions, action: val }
              })}
              label="Action"
            />
          )}
        </div>
      </SectionField>

      {/* Chimney Flashing */}
      <SectionField section="roof" fieldKey="chimney_flashing" label="Chimney Flashing Type">
        <div className="space-y-3">
          <CheckboxGroup
            options={flashingTypeOptions}
            selected={chimneyTypes}
            onChange={vals => updateLineItem('chimney_flashing', 'roof', {
              options: { ...chimneyOptions, types: vals }
            })}
          />
          {chimneyTypes.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
              <input
                type="text"
                value={(chimneyOptions.color as string) || ''}
                onChange={e => updateLineItem('chimney_flashing', 'roof', {
                  options: { ...chimneyOptions, color: e.target.value }
                })}
                placeholder="Flashing color"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}
        </div>
      </SectionField>

      {/* Roof to Wall Flashing */}
      <SectionField section="roof" fieldKey="roof_wall_flashing" label="Roof to Wall Flashing Type">
        <div className="space-y-3">
          <CheckboxGroup
            options={flashingTypeOptions}
            selected={roofWallTypes}
            onChange={vals => updateLineItem('roof_wall_flashing', 'roof', {
              options: { ...roofWallOptions, types: vals }
            })}
          />
          {roofWallTypes.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
              <input
                type="text"
                value={(roofWallOptions.color as string) || ''}
                onChange={e => updateLineItem('roof_wall_flashing', 'roof', {
                  options: { ...roofWallOptions, color: e.target.value }
                })}
                placeholder="Flashing color"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}
        </div>
      </SectionField>

      {/* Ventilation — managed product options */}
      <SectionField section="roof" fieldKey="ventilation" label="Ventilation">
        {ventCatId ? (
          <ManagedSelect
            categoryId={ventCatId}
            value={(getLineItem('ventilation', 'roof')?.options as Record<string, string>)?.type || ''}
            onChange={(val, optId) => updateLineItem('ventilation', 'roof', {
              options: { type: val, option_id: optId },
              description: val,
            })}
            placeholder="Select ventilation type..."
            allowCustom
          />
        ) : (
          <input
            type="text"
            value={getLineItem('ventilation', 'roof')?.description || ''}
            onChange={e => updateLineItem('ventilation', 'roof', { description: e.target.value })}
            placeholder="Ventilation details..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        )}
      </SectionField>

      {/* Pipe Boots — managed product options */}
      <SectionField section="roof" fieldKey="pipe_boots" label="Pipe Boots">
        {pipeBootsCatId ? (
          <ManagedSelect
            categoryId={pipeBootsCatId}
            value={(getLineItem('pipe_boots', 'roof')?.options as Record<string, string>)?.type || ''}
            onChange={(val, optId) => updateLineItem('pipe_boots', 'roof', {
              options: { type: val, option_id: optId },
              description: val,
            })}
            placeholder="Select pipe boots..."
            allowCustom
          />
        ) : (
          <input
            type="text"
            value={getLineItem('pipe_boots', 'roof')?.description || ''}
            onChange={e => updateLineItem('pipe_boots', 'roof', { description: e.target.value })}
            placeholder="Pipe boots details..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        )}
      </SectionField>

      {/* Warranty — smart dropdown tied to shingle line */}
      <SectionField section="roof" fieldKey="warranty" label="Warranty">
        {shingleLineId && warrantyTiers.length > 0 ? (
          <select
            value={warrantyValue}
            onChange={e => updateLineItem('warranty', 'roof', {
              options: { tier: e.target.value, tier_id: warrantyTiers.find(t => t.name === e.target.value)?.id },
              description: e.target.value,
            })}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
          >
            <option value="">Select warranty tier...</option>
            {warrantyTiers.map(t => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
          </select>
        ) : (
          <div>
            {!shingleLineId && (
              <p className="text-xs text-gray-400 mb-2">Select a shingle line above to see warranty options</p>
            )}
            <input
              type="text"
              value={getLineItem('warranty', 'roof')?.description || ''}
              onChange={e => updateLineItem('warranty', 'roof', { description: e.target.value })}
              placeholder="Warranty details..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        )}
      </SectionField>

      {/* Satellite */}
      <SectionField section="roof" fieldKey="satellite" label="Satellite">
        <RadioGroup
          options={[
            { value: 'remove', label: 'Remove' },
            { value: 'reset', label: 'Reset' },
          ]}
          selected={satType}
          onChange={val => updateLineItem('satellite', 'roof', { options: { type: val } })}
          allowDeselect
        />
      </SectionField>

      {/* Drip Edge — managed product options */}
      <SectionField section="roof" fieldKey="drip_edge" label="Drip Edge">
        {dripEdgeCatId ? (
          <ManagedSelect
            categoryId={dripEdgeCatId}
            value={(getLineItem('drip_edge', 'roof')?.options as Record<string, string>)?.type || ''}
            onChange={(val, optId) => updateLineItem('drip_edge', 'roof', {
              options: { type: val, option_id: optId },
              description: val,
            })}
            placeholder="Select drip edge..."
            allowCustom
          />
        ) : (
          <input
            type="text"
            value={getLineItem('drip_edge', 'roof')?.description || ''}
            onChange={e => updateLineItem('drip_edge', 'roof', { description: e.target.value })}
            placeholder="Drip edge details..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        )}
      </SectionField>

      {/* Extra Line Items */}
      <h3 className="font-medium text-gray-700 mt-6">Additional Items</h3>
      <CustomLineItems section="roof" />
    </div>
  )
}
