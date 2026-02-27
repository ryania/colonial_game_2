interface LoadingScreenProps {
  progress: number
  message: string
}

export const LoadingScreen = ({ progress, message }: LoadingScreenProps) => {
  const clampedProgress = Math.min(100, Math.max(0, progress))

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-[80]"
      style={{ background: 'linear-gradient(135deg, #0f3460 0%, #1a3a52 100%)' }}
    >
      {/* Title */}
      <h1 className="text-5xl font-bold text-amber-600 mb-2 drop-shadow-lg tracking-wide">
        COLONIAL STRATEGY GAME
      </h1>
      <p className="text-xl text-amber-500 mb-16 drop-shadow-lg">1600 – 1800</p>

      {/* Loading container */}
      <div className="w-96 flex flex-col items-center gap-4">
        {/* Step message */}
        <p className="text-amber-300 text-sm tracking-widest uppercase text-center min-h-5">
          {message}
        </p>

        {/* Progress bar track */}
        <div className="w-full h-4 bg-slate-800 rounded-full border border-slate-600 overflow-hidden shadow-inner">
          {/* Progress bar fill */}
          <div
            className="h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden"
            style={{
              width: `${clampedProgress}%`,
              background: 'linear-gradient(90deg, #92400e 0%, #d97706 50%, #f59e0b 100%)',
              boxShadow: '0 0 8px rgba(245, 158, 11, 0.5)',
            }}
          >
            {/* Shimmer effect */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                animation: 'shimmer 1.5s infinite',
              }}
            />
          </div>
        </div>

        {/* Percentage */}
        <p className="text-amber-400 text-xs font-mono tabular-nums">
          {clampedProgress.toFixed(0)}%
        </p>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  )
}
