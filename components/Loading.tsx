interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
}

export default function Loading({ size = 'md', message }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-3 border-gray-200 border-t-primary`}
      />
      {message && <p className="text-sm text-gray-500">{message}</p>}
    </div>
  )
}
