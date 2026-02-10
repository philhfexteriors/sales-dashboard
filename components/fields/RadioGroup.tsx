'use client'

interface RadioGroupProps {
  options: { value: string; label: string }[]
  selected: string | null
  onChange: (value: string | null) => void
  label?: string
  allowDeselect?: boolean
}

export default function RadioGroup({ options, selected, onChange, label, allowDeselect = false }: RadioGroupProps) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              if (allowDeselect && selected === opt.value) {
                onChange(null)
              } else {
                onChange(opt.value)
              }
            }}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
              selected === opt.value
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
