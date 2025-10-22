"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface PlayerAvatarChipProps {
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  size?: "sm" | "md";
  draggable?: boolean;
  selected?: boolean;
  onDragStart?: (playerId: string) => void;
  onClick?: (playerId: string) => void;
}

export function PlayerAvatarChip({
  playerId,
  playerName,
  playerAvatar,
  size = "sm",
  draggable = true,
  selected = false,
  onDragStart,
  onClick,
}: PlayerAvatarChipProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", playerId);
    if (onDragStart) onDragStart(playerId);
  };
  
  const handleClick = () => {
    if (onClick) onClick(playerId);
  };

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
  };

  return (
    <div
      draggable={draggable}
      onDragStart={handleDragStart}
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1",
        draggable && "cursor-move",
        onClick && "cursor-pointer",
        !draggable && !onClick && "cursor-default",
        selected && "ring-2 ring-blue-500 rounded-full"
      )}
      title={playerName}
    >
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={playerAvatar} />
        <AvatarFallback className="text-xs">{playerName[0]}</AvatarFallback>
      </Avatar>
    </div>
  );
}

