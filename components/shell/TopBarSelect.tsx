"use client";

import { forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarSelectProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  label: string;
  maxWidth?: number;
}

/**
 * Full-height topbar dropdown trigger with right border separator.
 * Use as `asChild` target inside `DropdownMenuTrigger`.
 */
export const TopBarSelect = forwardRef<HTMLButtonElement, TopBarSelectProps>(
  ({ icon, label, maxWidth = 200, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 h-full px-3 border-r text-sm",
        "hover:bg-accent/50 transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      style={{ maxWidth }}
      {...props}
    >
      {icon}
      <span className="truncate">{label}</span>
      <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" />
    </button>
  )
);

TopBarSelect.displayName = "TopBarSelect";
