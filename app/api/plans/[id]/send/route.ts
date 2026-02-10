import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import ProductionPlanPDF from '@/lib/pdf/ProductionPlanPDF'
import { sendPlanEmail } from '@/lib/services/email'
import React from 'react'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch plan
  const { data: plan, error: planErr } = await supabase
    .from('production_plans')
    .select('*')
    .eq('id', id)
    .single()

  if (planErr || !plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  // Fetch line items
  const { data: lineItems } = await supabase
    .from('plan_line_items')
    .select('*')
    .eq('plan_id', id)
    .order('sort_order')

  // Fetch active terms
  const { data: terms } = await supabase
    .from('terms_conditions')
    .select('content')
    .eq('active', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  // Generate PDF
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfElement = React.createElement(ProductionPlanPDF, {
    plan,
    lineItems: lineItems || [],
    termsContent: terms?.content || null,
  }) as any
  const pdfBuffer = await renderToBuffer(pdfElement)

  // Send email with properly formatted filename
  const clientName = plan.client_name || ''
  const cleanName = (clientName || 'Client').replace(/[^a-zA-Z0-9 ]/g, '').trim()
  const dateStr = plan.plan_date
    ? new Date(plan.plan_date + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : plan.signed_at
      ? new Date(plan.signed_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  const pdfFileName = `H&F Exteriors Production Plan - ${cleanName} - ${dateStr}.pdf`

  const result = await sendPlanEmail({
    clientEmail: plan.client_email || '',
    salespersonEmail: user.email || '',
    clientName,
    pdfBuffer: Buffer.from(pdfBuffer),
    pdfFileName,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // Update plan status
  await supabase
    .from('production_plans')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', id)

  return NextResponse.json({ success: true })
}
