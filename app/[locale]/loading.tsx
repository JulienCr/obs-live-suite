import { Skeleton } from "@/components/ui/skeleton";

/**
 * Root locale loading state
 * Shows a minimal loading indicator while the page loads
 */
export default function LocaleLoading() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-var(--topbar-height))]">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
