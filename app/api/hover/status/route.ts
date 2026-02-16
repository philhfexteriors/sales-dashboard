import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isHoverConfigured, isHoverConnected } from '@/lib/services/hoverApi'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const configured = isHoverConfigured()
  let connected = false
  if (configured) {
    try {
      connected = await isHoverConnected()
    } catch (err) {
      console.error('[hover/status] Error checking connection:', err)
    }
  }

  return NextResponse.json({ configured, connected })
}
