import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isHoverConfigured, isHoverConnected } from '@/lib/services/hoverApi'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const configured = isHoverConfigured()
  const connected = configured ? await isHoverConnected() : false

  console.log('[hover/status] HOVER_CLIENT_ID set:', !!process.env.HOVER_CLIENT_ID, '| HOVER_CLIENT_SECRET set:', !!process.env.HOVER_CLIENT_SECRET, '| configured:', configured, '| connected:', connected)

  return NextResponse.json({ configured, connected })
}
