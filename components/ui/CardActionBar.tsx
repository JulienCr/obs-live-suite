"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export interface CardAction {
  icon: React.ComponentType<{ className?: string }>;
  label?: string;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "outline" | "destructive" | "ghost";
  title?: string;
  disabled?: boolean;
  className?: string;
}

export interface CardActionBarProps {
  actions: CardAction[];
  secondaryActions?: CardAction[];
  showLabels?: boolean;
  className?: string;
}

/**
 * Reusable action bar component for card hover states.
 * Renders with opacity-0 group-hover:opacity-100 transition.
 * Supports primary and secondary action rows.
 */
export function CardActionBar({
  actions,
  secondaryActions,
  showLabels = false,
  className,
}: CardActionBarProps) {
  const renderAction = (action: CardAction, index: number) => {
    const Icon = action.icon;
    const showLabel = showLabels && action.label;

    const button = (
      <Button
        key={index}
        variant={action.variant ?? "outline"}
        size="sm"
        onClick={action.onClick}
        title={action.title}
        disabled={action.disabled}
        className={cn(
          showLabel ? "flex-1" : "px-2",
          action.className
        )}
        asChild={!!action.href}
      >
        {action.href ? (
          <Link href={action.href}>
            <Icon className={cn("w-3 h-3", showLabel && "mr-1")} />
            {showLabel && <span className="text-xs">{action.label}</span>}
          </Link>
        ) : (
          <>
            <Icon className={cn("w-3 h-3", showLabel && "mr-1")} />
            {showLabel && <span className="text-xs">{action.label}</span>}
          </>
        )}
      </Button>
    );

    return button;
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity",
        className
      )}
    >
      {/* Primary actions row */}
      {actions.length > 0 && (
        <div className="flex gap-1.5">
          {actions.map(renderAction)}
        </div>
      )}

      {/* Secondary actions row */}
      {secondaryActions && secondaryActions.length > 0 && (
        <div className="flex gap-1.5">
          {secondaryActions.map(renderAction)}
        </div>
      )}
    </div>
  );
}
