'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import Link from 'next/link'
import toast from 'react-hot-toast'

function useSignatureCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasSignature, setHasSignature] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)

  function initCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  function getPos(e: React.TouchEvent | React.MouseEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }

  function startDraw(e: React.TouchEvent | React.MouseEvent) {
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    setIsDrawing(true)
    setHasSignature(true)
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  function draw(e: React.TouchEvent | React.MouseEvent) {
    if (!isDrawing) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  function endDraw() {
    setIsDrawing(false)
  }

  function clear() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  function toDataURL() {
    return canvasRef.current!.toDataURL('image/png')
  }

  return { canvasRef, hasSignature, initCanvas, startDraw, draw, endDraw, clear, toDataURL }
}

export default function SignPlan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Client signature
  const clientSig = useSignatureCanvas()
  const [signedName, setSignedName] = useState('')

  // Salesperson signature
  const spSig = useSignatureCanvas()
  const [salespersonName, setSalespersonName] = useState('')

  // E-consent checkbox
  const [eConsentChecked, setEConsentChecked] = useState(false)

  // Editable date
  const [planDate, setPlanDate] = useState(() => {
    const now = new Date()
    return now.toISOString().split('T')[0]
  })

  useEffect(() => {
    clientSig.initCanvas()
    spSig.initCanvas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const allValid =
    clientSig.hasSignature &&
    signedName.trim() !== '' &&
    spSig.hasSignature &&
    salespersonName.trim() !== '' &&
    eConsentChecked

  async function handleComplete() {
    if (!clientSig.hasSignature || !signedName.trim()) {
      toast.error('Please have the client sign and enter their name')
      return
    }
    if (!spSig.hasSignature || !salespersonName.trim()) {
      toast.error('Please sign as salesperson and enter your name')
      return
    }
    if (!eConsentChecked) {
      toast.error('Please acknowledge the electronic signature consent')
      return
    }

    setSaving(true)
    const clientSignatureData = clientSig.toDataURL()
    const salespersonSignatureData = spSig.toDataURL()

    const res = await fetch(`/api/plans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: {
          signature_data: clientSignatureData,
          signed_by_name: signedName.trim(),
          signed_at: new Date().toISOString(),
          salesperson_signature_data: salespersonSignatureData,
          salesperson_name: salespersonName.trim(),
          plan_date: planDate,
          status: 'signed',
        },
      }),
    })

    if (res.ok) {
      toast.success('Signed successfully!')
      router.push(`/plans/${id}/complete`)
    } else {
      toast.error('Failed to save signatures')
      setSaving(false)
    }
  }

  // Short plan ID for display
  const shortId = id.slice(0, 8).toUpperCase()

  return (
    <AppShell>
      <div className="p-6 max-w-3xl mx-auto">
        {/* Back to review */}
        <Link
          href={`/plans/${id}/review`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-dark font-medium mb-4"
        >
          ← Back to Pricing & Review
        </Link>

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Sign Production Plan</h1>
          <span className="text-xs font-mono text-gray-400">Plan #{shortId}</span>
        </div>

        {/* Legal agreement */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-gray-700 space-y-3">
          <p className="font-semibold text-gray-900">Agreement & Authorization</p>
          <p>
            By signing below, I confirm that I have reviewed the complete Production Plan
            and Payment Terms for Plan #{shortId}, including all line items, pricing, and
            scope of work described therein. I agree to the scope of work and pricing as
            described in this Production Plan.
          </p>
          <p>
            I understand that all supplemental invoices approved by my insurance carrier
            (if applicable) will affect the Replacement Cost Value and Sale Price, but will
            not affect my out-of-pocket cost.
          </p>
          <p>
            I understand that I have the right to cancel this contract within three (3)
            business days of signing, by providing written notice to the contractor.
          </p>
        </div>

        {/* Client Signature */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Homeowner Signature</h2>

          <div className="bg-white rounded-lg border-2 border-gray-300 mb-3 relative">
            <canvas
              ref={clientSig.canvasRef}
              className="w-full h-48 touch-none cursor-crosshair"
              onMouseDown={clientSig.startDraw}
              onMouseMove={clientSig.draw}
              onMouseUp={clientSig.endDraw}
              onMouseLeave={clientSig.endDraw}
              onTouchStart={clientSig.startDraw}
              onTouchMove={clientSig.draw}
              onTouchEnd={clientSig.endDraw}
            />
            {!clientSig.hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-gray-300 text-lg">Homeowner sign here</p>
              </div>
            )}
          </div>

          <div className="flex justify-end mb-3">
            <button onClick={clientSig.clear} className="text-sm text-gray-500 hover:text-gray-700">
              Clear
            </button>
          </div>

          {/* Name and Date side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Homeowner Print Name</label>
              <input
                type="text"
                value={signedName}
                onChange={e => setSignedName(e.target.value)}
                placeholder="Full name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={planDate}
                onChange={e => setPlanDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>

        {/* Salesperson Signature */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Salesperson Signature</h2>

          <div className="bg-white rounded-lg border-2 border-gray-300 mb-3 relative">
            <canvas
              ref={spSig.canvasRef}
              className="w-full h-48 touch-none cursor-crosshair"
              onMouseDown={spSig.startDraw}
              onMouseMove={spSig.draw}
              onMouseUp={spSig.endDraw}
              onMouseLeave={spSig.endDraw}
              onTouchStart={spSig.startDraw}
              onTouchMove={spSig.draw}
              onTouchEnd={spSig.endDraw}
            />
            {!spSig.hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-gray-300 text-lg">Salesperson sign here</p>
              </div>
            )}
          </div>

          <div className="flex justify-end mb-3">
            <button onClick={spSig.clear} className="text-sm text-gray-500 hover:text-gray-700">
              Clear
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salesperson Print Name</label>
            <input
              type="text"
              value={salespersonName}
              onChange={e => setSalespersonName(e.target.value)}
              placeholder="Full name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* E-Consent Checkbox */}
        <div className="mb-6 bg-gray-50 rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={eConsentChecked}
              onChange={e => setEConsentChecked(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary/50 shrink-0"
            />
            <span className="text-sm text-gray-700">
              I agree to sign this document electronically and acknowledge that my electronic
              signature has the same legal effect, validity, and enforceability as a handwritten
              signature under the federal ESIGN Act (15 U.S.C. &sect; 7001 et seq.) and applicable
              state law. I confirm that I intend to be legally bound by this Production Plan.
            </span>
          </label>
        </div>

        {/* Timestamp display */}
        <div className="text-xs text-gray-400 text-center mb-4">
          Signing timestamp and device information will be recorded for verification purposes.
        </div>

        {/* Complete Button */}
        <button
          onClick={handleComplete}
          disabled={saving || !allValid}
          className="w-full py-4 rounded-xl font-semibold bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Complete & Send'}
        </button>
      </div>
    </AppShell>
  )
}
