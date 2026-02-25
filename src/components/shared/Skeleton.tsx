// src/components/shared/Skeleton.tsx

interface SkeletonProps {
  className?: string
}

export const Skeleton = ({ className = '' }: SkeletonProps) =>
  <div className={`animate-pulse rounded-md bg-muted ${className}`} />

// Pre-composed shapes used across pages
export const TripCardSkeleton = () => (
  <div className="p-5 rounded-xl border bg-card space-y-3">
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <div className="flex -space-x-2">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
    </div>
  </div>
)

export const ExpenseCardSkeleton = () => (
  <div className="p-4 rounded-lg border bg-card flex items-center gap-3">
    <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-2/5" />
      <Skeleton className="h-3 w-1/3" />
    </div>
    <Skeleton className="h-4 w-16" />
  </div>
)

export const BalanceRowSkeleton = () => (
  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
    <div className="flex items-center gap-2">
      <Skeleton className="w-7 h-7 rounded-full" />
      <Skeleton className="h-4 w-20" />
    </div>
    <Skeleton className="h-4 w-24" />
  </div>
)
