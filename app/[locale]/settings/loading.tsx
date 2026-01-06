import { Skeleton } from "@/components/ui/skeleton";

/**
 * Settings loading state
 * Shows skeleton for settings form pages
 */
export default function SettingsLoading() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <Skeleton className="h-8 w-40 mb-6" />
      
      {/* Form fields */}
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        
        {/* Submit button */}
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
