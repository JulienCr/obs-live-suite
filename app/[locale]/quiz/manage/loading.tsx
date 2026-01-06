import { Skeleton } from "@/components/ui/skeleton";

/**
 * Quiz manage loading state
 * Shows skeleton for the question editor page
 */
export default function QuizManageLoading() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <Skeleton className="h-8 w-48 mb-6" />
      
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b pb-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
      
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Question list */}
        <div>
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
        
        {/* Editor form */}
        <div>
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
