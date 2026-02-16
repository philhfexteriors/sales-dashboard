import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Debug endpoint: returns the raw structure of measurements_json from the most recent bid.
 * Shows types and shapes of all keys to help fix the [object Object] formula error.
 *
 * GET /api/debug/measurements
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get the most recent bid with measurements_json
  const { data: bid, error } = await supabase
    .from('bids')
    .select('id, trade, measurements_json')
    .not('measurements_json', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !bid) {
    return NextResponse.json({ error: 'No bids with measurements found', details: error }, { status: 404 })
  }

  const measurements = bid.measurements_json as Record<string, unknown>

  // Build a deep structure map showing types at every level
  function describeStructure(obj: unknown, depth = 0, maxDepth = 4): unknown {
    if (depth > maxDepth) return '...(max depth)'
    if (obj === null) return 'null'
    if (obj === undefined) return 'undefined'
    if (typeof obj === 'number') return `number(${obj})`
    if (typeof obj === 'string') return `string("${obj.slice(0, 100)}")`
    if (typeof obj === 'boolean') return `boolean(${obj})`
    if (Array.isArray(obj)) {
      if (obj.length === 0) return 'array(empty)'
      return {
        _type: `array(${obj.length} items)`,
        _first: describeStructure(obj[0], depth + 1, maxDepth),
        ...(obj.length > 1 ? { _second: describeStructure(obj[1], depth + 1, maxDepth) } : {}),
      }
    }
    if (typeof obj === 'object') {
      const result: Record<string, unknown> = { _type: 'object', _keys: Object.keys(obj) }
      for (const [key, value] of Object.entries(obj)) {
        result[key] = describeStructure(value, depth + 1, maxDepth)
      }
      return result
    }
    return `${typeof obj}(?)`
  }

  // Get top-level keys and their types
  const topLevelKeys = Object.keys(measurements)
  const structure = describeStructure(measurements)

  // Also grab the raw roof data specifically since that's where the error occurs
  const roofRaw = measurements.roof || measurements.roof_summary
  const roofStructure = describeStructure(roofRaw, 0, 5)

  return NextResponse.json({
    bid_id: bid.id,
    trade: bid.trade,
    top_level_keys: topLevelKeys,
    structure,
    roof_raw: roofRaw,
    roof_structure: roofStructure,
    // Also show measurements_json directly at depth 1 for key fields
    raw_roof: measurements.roof,
    raw_roof_summary: measurements.roof_summary,
    raw_summary: measurements.summary,
  })
}
