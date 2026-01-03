import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface CardShellProps {
  /**
   * The title displayed in the card header
   */
  title: string;
  /**
   * Optional icon element to display before the title
   */
  icon?: React.ReactNode;
  /**
   * Additional CSS classes for the Card wrapper
   */
  className?: string;
  /**
   * Optional elements to render on the right side of the header (e.g., status indicators, buttons)
   */
  headerActions?: React.ReactNode;
  /**
   * Additional CSS classes for the CardContent wrapper
   */
  contentClassName?: string;
  /**
   * The card content
   */
  children: React.ReactNode;
}

/**
 * CardShell - A reusable wrapper component for dashboard cards.
 *
 * Provides a consistent Card structure with:
 * - Card wrapper with optional className
 * - CardHeader with title, optional icon, and optional header actions
 * - CardContent with space-y-4 by default
 *
 * @example
 * ```tsx
 * <CardShell
 *   title={t("title")}
 *   icon={<Timer className="h-5 w-5" />}
 *   headerActions={<StatusIndicator active={isRunning} />}
 * >
 *   <ControlButtons />
 * </CardShell>
 * ```
 */
export function CardShell({
  title,
  icon,
  className,
  headerActions,
  contentClassName,
  children,
}: CardShellProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
          {headerActions}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("space-y-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
