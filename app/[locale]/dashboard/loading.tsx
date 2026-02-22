import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard loading state
 * Shows skeleton matching the Dockview panel layout
 */
export default function DashboardLoading() {
  return (
    <div className="h-[calc(100vh-var(--topbar-height))] w-full p-2">
      <div className="flex flex-col h-full gap-2">
        {/* Main panels area */}
        <div className="flex-1 flex gap-2">
          <Skeleton className="flex-1 rounded-md" />
        </div>
        {/* Bottom panel area */}
        <Skeleton className="h-[250px] w-full rounded-md" />
      </div>
    </div>
  );
}
