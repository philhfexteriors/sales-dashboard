import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import BidPDF from '@/lib/pdf/BidPDF'
import React from 'react'

function makeBidPdfFilename(bid: { client_name?: string | null }): string {
  const clientName = (bid.client_name || 'Client').replace(/[^a-zA-Z0-9 ]/g, '').trim()
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
  return `H&F Exteriors Bid - ${clientName} - ${dateStr}.pdf`
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch bid
  const { data: bid, error: bidErr } = await supabase
    .from('bids')
    .select('*')
    .eq('id', id)
    .single()

  if (bidErr || !bid) {
    return NextResponse.json({ error: 'Bid not found' }, { status: 404 })
  }

  // Fetch current version
  const { data: version } = await supabase
    .from('bid_versions')
    .select('*')
    .eq('bid_id', id)
    .neq('status', 'superseded')
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  // Fetch line items
  const { data: lineItems } = await supabase
    .from('bid_line_items')
    .select('*')
    .eq('version_id', version?.id || '')
    .order('section')
    .order('sort_order')

  // Render PDF
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfElement = React.createElement(BidPDF, {
    bid,
    lineItems: lineItems || [],
    versionNumber: version?.version_number || 1,
  }) as any
  const pdfBuffer = await renderToBuffer(pdfElement)

  // Upload to Supabase Storage
  const storageFileName = `bid-${id}-${Date.now()}.pdf`
  const displayFileName = makeBidPdfFilename(bid)
  const { error: uploadErr } = await supabase.storage
    .from('bids')
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
    .from('bids')
    .getPublicUrl(storageFileName)

  const pdfUrl = urlData?.publicUrl || null

  // Update bid with PDF URL
  if (pdfUrl) {
    await supabase
      .from('bids')
      .update({ pdf_url: pdfUrl })
      .eq('id', id)
  }

  return NextResponse.json({ pdf_url: pdfUrl, fileName: displayFileName })
}

// GET: download the PDF directly
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch bid
  const { data: bid, error: bidErr } = await supabase
    .from('bids')
    .select('*')
    .eq('id', id)
    .single()

  if (bidErr || !bid) {
    return NextResponse.json({ error: 'Bid not found' }, { status: 404 })
  }

  // Fetch current version
  const { data: version } = await supabase
    .from('bid_versions')
    .select('*')
    .eq('bid_id', id)
    .neq('status', 'superseded')
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  // Fetch line items
  const { data: lineItems } = await supabase
    .from('bid_line_items')
    .select('*')
    .eq('version_id', version?.id || '')
    .order('section')
    .order('sort_order')

  // Render PDF
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfElement = React.createElement(BidPDF, {
    bid,
    lineItems: lineItems || [],
    versionNumber: version?.version_number || 1,
  }) as any
  const pdfBuffer = await renderToBuffer(pdfElement)

  const fileName = makeBidPdfFilename(bid)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}"`,
    },
  })
}
