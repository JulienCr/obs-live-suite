import { Skeleton } from "@/components/ui/skeleton";

/**
 * Assets loading state
 * Shows skeleton for asset management pages (guests, posters, themes)
 */
export default function AssetsLoading() {
  return (
    <div className="p-6">
      {/* Header */}
      <Skeleton className="h-8 w-48 mb-6" />
      
      {/* Grid of asset cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-md border bg-card p-4">
            <Skeleton className="aspect-video w-full mb-3" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
