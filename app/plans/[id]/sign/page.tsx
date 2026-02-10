'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'

export default function SignPlan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [signedName, setSignedName] = useState('')
  const [saving, setSaving] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simple canvas setup for signature
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    setLoading(false)
  }, [])

  function getPos(e: React.TouchEvent | React.MouseEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    }
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

  function clearSignature() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  async function handleComplete() {
    if (!hasSignature || !signedName.trim()) {
      toast.error('Please sign and enter your name')
      return
    }

    setSaving(true)
    const canvas = canvasRef.current!
    const signatureData = canvas.toDataURL('image/png')

    const res = await fetch(`/api/plans/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: {
          signature_data: signatureData,
          signed_by_name: signedName.trim(),
          signed_at: new Date().toISOString(),
          status: 'signed',
        },
      }),
    })

    if (res.ok) {
      toast.success('Signed successfully!')
      router.push(`/plans/${id}/complete`)
    } else {
      toast.error('Failed to save signature')
      setSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign Production Plan</h1>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-gray-600">
          I agree to the Production Plan and Pricing outlined above. I understand that all
          supplemental invoices approved by my insurance carrier (if applicable) will affect
          the Replacement Cost Value and Sale Price, but will not affect my out-of-pocket cost.
        </div>

        {/* Signature Canvas */}
        <div className="bg-white rounded-lg border-2 border-gray-300 mb-4 relative">
          <canvas
            ref={canvasRef}
            className="w-full h-48 touch-none cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          {!hasSignature && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-gray-300 text-lg">Sign here</p>
            </div>
          )}
        </div>

        <div className="flex justify-end mb-6">
          <button
            onClick={clearSignature}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear Signature
          </button>
        </div>

        {/* Printed Name */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-1">Print Name</label>
          <input
            type="text"
            value={signedName}
            onChange={e => setSignedName(e.target.value)}
            placeholder="Full name"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Complete Button */}
        <button
          onClick={handleComplete}
          disabled={saving || !hasSignature || !signedName.trim()}
          className="w-full py-4 rounded-xl font-semibold bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Complete & Send'}
        </button>
      </div>
    </AppShell>
  )
}
