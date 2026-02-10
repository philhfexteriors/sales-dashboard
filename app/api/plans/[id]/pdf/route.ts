import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import ProductionPlanPDF from '@/lib/pdf/ProductionPlanPDF'
import React from 'react'

// Generate the standard PDF filename: "H&F Exteriors Production Plan - Client Name - Date.pdf"
function makePdfFilename(plan: { client_name?: string; plan_date?: string; signed_at?: string }): string {
  const clientName = (plan.client_name || 'Client').replace(/[^a-zA-Z0-9 ]/g, '').trim()
  const dateStr = plan.plan_date
    ? new Date(plan.plan_date + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : plan.signed_at
      ? new Date(plan.signed_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  return `H&F Exteriors Production Plan - ${clientName} - ${dateStr}.pdf`
}

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

  // Render PDF
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfElement = React.createElement(ProductionPlanPDF, {
    plan,
    lineItems: lineItems || [],
    termsContent: terms?.content || null,
  }) as any
  const pdfBuffer = await renderToBuffer(pdfElement)

  // Upload to Supabase Storage (use ID-based name for storage, user-friendly name for downloads)
  const storageFileName = `plan-${id}-${Date.now()}.pdf`
  const displayFileName = makePdfFilename(plan)
  const { error: uploadErr } = await supabase.storage
    .from('production-plans')
    .upload(storageFileName, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadErr) {
    // Storage bucket may not exist yet — return PDF directly
    console.warn('Storage upload failed (bucket may not exist):', uploadErr.message)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${displayFileName}"`,
      },
    })
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('production-plans')
    .getPublicUrl(storageFileName)

  const pdfUrl = urlData?.publicUrl || null

  // Update plan with PDF URL
  if (pdfUrl) {
    await supabase
      .from('production_plans')
      .update({ pdf_url: pdfUrl })
      .eq('id', id)
  }

  return NextResponse.json({ pdf_url: pdfUrl, fileName: displayFileName })
}

// GET: download the PDF directly
export async function GET(
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

  // Render PDF
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfElement2 = React.createElement(ProductionPlanPDF, {
    plan,
    lineItems: lineItems || [],
    termsContent: terms?.content || null,
  }) as any
  const pdfBuffer = await renderToBuffer(pdfElement2)

  const fileName = makePdfFilename(plan)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}"`,
    },
  })
}
