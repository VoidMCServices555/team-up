import React from 'react'

// ── Shimmer animation base ────────────────────────────────────────────────────
function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-[#313244] rounded ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  )
}

// ── Single message skeleton ───────────────────────────────────────────────────
function MessageSkeleton({ short = false, lines = 2 }: { short?: boolean; lines?: number }) {
  // عرض عشوائي للسطور عشان يبان طبيعي
  const lineWidths = ['w-3/4', 'w-1/2', 'w-5/6', 'w-2/3', 'w-4/5']
  return (
    <div className="flex gap-4 px-4 py-1">
      {/* Avatar */}
      <Shimmer className="w-10 h-10 rounded-full flex-shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2 pt-0.5">
        {/* Username + timestamp */}
        <div className="flex items-center gap-2">
          <Shimmer className="h-3.5 w-24 rounded" />
          <Shimmer className="h-2.5 w-16 rounded opacity-50" />
        </div>
        {/* Message lines */}
        {Array.from({ length: lines }).map((_, i) => (
          <Shimmer
            key={i}
            className={`h-3 rounded ${i === lines - 1 && lines > 1 ? lineWidths[i % lineWidths.length] : 'w-full'}`}
          />
        ))}
      </div>
    </div>
  )
}

// ── Chat loading skeleton (Discord style) ────────────────────────────────────
export function ChatSkeleton() {
  // pattern مختلف لكل رسالة عشان يبان طبيعي
  const messages = [
    { lines: 3 }, { lines: 1 }, { lines: 4 }, { lines: 2 },
    { lines: 1 }, { lines: 3 }, { lines: 2 }, { lines: 1 },
  ]

  return (
    <div className="flex-1 flex flex-col justify-end pb-4 space-y-4 overflow-hidden">
      {/* Date separator skeleton */}
      <div className="flex items-center gap-3 px-4">
        <div className="flex-1 h-px bg-[#313244]" />
        <Shimmer className="h-3 w-24 rounded-full" />
        <div className="flex-1 h-px bg-[#313244]" />
      </div>
      {messages.map((msg, i) => (
        <MessageSkeleton key={i} lines={msg.lines} />
      ))}
    </div>
  )
}

// ── Members list skeleton ─────────────────────────────────────────────────────
export function MembersSkeleton() {
  return (
    <div className="space-y-1 px-2">
      {/* Category header */}
      <Shimmer className="h-3 w-20 rounded mb-2" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-1.5">
          <Shimmer className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Shimmer className="h-3 w-24 rounded" />
            <Shimmer className="h-2 w-16 rounded opacity-60" />
          </div>
        </div>
      ))}
      <Shimmer className="h-3 w-16 rounded mt-4 mb-2" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-1.5 opacity-50">
          <Shimmer className="w-8 h-8 rounded-full flex-shrink-0" />
          <Shimmer className="h-3 w-20 rounded" />
        </div>
      ))}
    </div>
  )
}

// ── DM Sidebar skeleton ───────────────────────────────────────────────────────
export function DMSidebarSkeleton() {
  return (
    <div className="space-y-1 px-2 pt-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-1.5">
          <Shimmer className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Shimmer className="h-3 w-20 rounded" />
            <Shimmer className="h-2 w-28 rounded opacity-60" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Profile skeleton ──────────────────────────────────────────────────────────
export function ProfileSkeleton() {
  return (
    <div className="w-full">
      {/* Banner */}
      <Shimmer className="h-20 w-full rounded-none" />
      <div className="px-4 pt-2 pb-4">
        {/* Avatar */}
        <Shimmer className="w-16 h-16 rounded-full -mt-8 border-4 border-[#2b2d31]" />
        <div className="mt-3 space-y-2">
          <Shimmer className="h-5 w-32 rounded" />
          <Shimmer className="h-3 w-24 rounded opacity-70" />
        </div>
        <div className="h-px bg-[#313244] my-4" />
        <div className="space-y-3">
          <Shimmer className="h-3 w-16 rounded" />
          <Shimmer className="h-3 w-full rounded" />
          <Shimmer className="h-3 w-4/5 rounded" />
        </div>
      </div>
    </div>
  )
}

// ── Generic page skeleton ─────────────────────────────────────────────────────
export function PageSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
      <div className="w-16 h-16 rounded-full bg-[#313244] relative overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>
      <div className="space-y-2 w-48">
        <Shimmer className="h-4 w-full rounded" />
        <Shimmer className="h-3 w-3/4 mx-auto rounded" />
      </div>
    </div>
  )
}
