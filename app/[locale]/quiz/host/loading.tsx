import { Skeleton } from "@/components/ui/skeleton";

/**
 * Quiz host loading state
 * Shows skeleton matching the quiz host panel layout
 */
export default function QuizHostLoading() {
  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="h-14 border-b px-4 flex items-center gap-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-32" />
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Navigator sidebar */}
        <div className="w-64 border-r p-4 space-y-4">
          <Skeleton className="h-6 w-32 mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        
        {/* Question stage */}
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="aspect-video w-full max-w-2xl mb-6" />
          <div className="grid grid-cols-2 gap-4 max-w-2xl">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </div>
        
        {/* Players panel */}
        <div className="w-72 border-l p-4 space-y-3">
          <Skeleton className="h-6 w-20 mb-4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
