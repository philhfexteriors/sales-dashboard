'use client'

interface CountInputProps {
  value: number
  onChange: (value: number) => void
  label?: string
  min?: number
  max?: number
}

export default function CountInput({ value, onChange, label, min = 0, max = 99 }: CountInputProps) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
        >
          -
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={e => {
            const v = parseInt(e.target.value) || 0
            onChange(Math.min(max, Math.max(min, v)))
          }}
          className="w-16 text-center py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
        >
          +
        </button>
      </div>
    </div>
  )
}
