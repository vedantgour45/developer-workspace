interface Props {
  label?: string
}

export default function LoadingFallback({ label = 'Loading…' }: Props) {
  return (
    <div className="min-h-full flex items-center justify-center p-12">
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-9 h-9">
          <div className="absolute inset-0 rounded-full border-2 border-hairline" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
        </div>
        <p className="text-sm text-muted font-medium">{label}</p>
      </div>
    </div>
  )
}
