"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Edit,
  GripVertical,
  Youtube,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MediaItem, MediaInstance, MediaType } from "@/lib/models/Media";
import { secondsToTimecode, timecodeToSeconds } from "@/lib/utils/media";

interface WidgetCardProps {
  size?: string;
  className?: string;
  settings?: Record<string, unknown>;
}

export function MediaCard({ size = "medium", className = "" }: WidgetCardProps) {
  const [instance, setInstance] = useState<MediaInstance>(MediaInstance.A);
  const [isOn, setIsOn] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [newUrl, setNewUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch state when instance changes
  useEffect(() => {
    fetchState();
  }, [instance]);

  const fetchState = async () => {
    try {
      const response = await fetch(`/api/media/${instance}/state`);
      if (response.ok) {
        const data = await response.json();
        setIsOn(data.playlist.on);
        setIsMuted(data.playlist.muted);
        setItems(data.playlist.items);
        setCurrentIndex(data.playlist.index);
      }
    } catch (error) {
      console.error("Failed to fetch media state:", error);
    }
  };

  const handleAddItem = async () => {
    if (!newUrl.trim()) return;

    setIsAdding(true);
    try {
      const response = await fetch(`/api/media/${instance}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl }),
      });

      if (response.ok) {
        setNewUrl("");
        await fetchState();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add media item");
      }
    } catch (error) {
      console.error("Failed to add item:", error);
      alert("Failed to add media item");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Delete this media item?")) return;

    try {
      const response = await fetch(`/api/media/${instance}/items/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchState();
      }
    } catch (error) {
      console.error("Failed to delete item:", error);
    }
  };

  const handleUpdateItem = async (id: string, updates: any) => {
    try {
      const response = await fetch(`/api/media/${instance}/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await fetchState();
      }
    } catch (error) {
      console.error("Failed to update item:", error);
    }
  };

  const handleReorder = async (newItems: MediaItem[]) => {
    const order = newItems.map((item) => item.id);

    try {
      await fetch(`/api/media/${instance}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      });

      setItems(newItems);
    } catch (error) {
      console.error("Failed to reorder items:", error);
    }
  };

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/media/${instance}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on: !isOn }),
      });

      if (response.ok) {
        setIsOn(!isOn);
      }
    } catch (error) {
      console.error("Failed to toggle media:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    try {
      await fetch(`/api/media/${instance}/next`, {
        method: "POST",
      });
      await fetchState();
    } catch (error) {
      console.error("Failed to move to next:", error);
    }
  };

  const handleMute = async () => {
    try {
      const response = await fetch(`/api/media/${instance}/mute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ muted: !isMuted }),
      });

      if (response.ok) {
        setIsMuted(!isMuted);
      }
    } catch (error) {
      console.error("Failed to toggle mute:", error);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      handleReorder(newItems);
    }
  };

  const currentItem = items[currentIndex];

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Media Overlay
              </CardTitle>
              {isOn && (
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              )}
            </div>

            {/* Instance switcher */}
            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                size="sm"
                variant={instance === MediaInstance.A ? "default" : "ghost"}
                onClick={() => setInstance(MediaInstance.A)}
                className="h-7 px-3"
              >
                A
              </Button>
              <Button
                size="sm"
                variant={instance === MediaInstance.B ? "default" : "ghost"}
                onClick={() => setInstance(MediaInstance.B)}
                className="h-7 px-3"
              >
                B
              </Button>
            </div>
          </div>

          <CardDescription>
            Fullscreen media player with YouTube, MP4, and images
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Transport controls */}
          <div className="flex gap-2">
            <Button
              onClick={handleToggle}
              disabled={isLoading || items.length === 0}
              className="flex-1"
              variant={isOn ? "default" : "outline"}
            >
              {isOn ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Turn Off
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Turn On
                </>
              )}
            </Button>

            <Button
              onClick={handleNext}
              disabled={!isOn || items.length === 0}
              variant="outline"
            >
              <SkipForward className="w-4 h-4" />
            </Button>

            <Button
              onClick={handleMute}
              disabled={!isOn}
              variant="outline"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Current item display */}
          {currentItem && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                {currentItem.type === MediaType.YOUTUBE && (
                  <Youtube className="w-4 h-4 text-red-500" />
                )}
                {currentItem.type === MediaType.MP4 && (
                  <Video className="w-4 h-4 text-blue-500" />
                )}
                {currentItem.type === MediaType.IMAGE && (
                  <ImageIcon className="w-4 h-4 text-green-500" />
                )}
                <span className="font-medium text-sm truncate">
                  {currentItem.title || "Untitled"}
                </span>
                <Badge variant="outline" className="ml-auto">
                  {currentIndex + 1}/{items.length}
                </Badge>
              </div>
            </div>
          )}

          {/* Add media URL */}
          <div className="flex gap-2">
            <Input
              placeholder="Paste YouTube, MP4, or image URL..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
              disabled={isAdding}
            />
            <Button
              onClick={handleAddItem}
              disabled={isAdding || !newUrl.trim()}
              size="icon"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Playlist */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Playlist ({items.length})</div>

            {items.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No media items. Add a URL above.
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={items.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {items.map((item, index) => (
                      <SortableMediaItem
                        key={item.id}
                        item={item}
                        isActive={index === currentIndex}
                        onEdit={setEditingItem}
                        onDelete={handleDeleteItem}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      {editingItem && (
        <EditItemDialog
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(updates) => {
            handleUpdateItem(editingItem.id, updates);
            setEditingItem(null);
          }}
        />
      )}
    </>
  );
}

/**
 * Sortable media item
 */
function SortableMediaItem({
  item,
  isActive,
  onEdit,
  onDelete,
}: {
  item: MediaItem;
  isActive: boolean;
  onEdit: (item: MediaItem) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-lg border ${
        isActive ? "bg-primary/10 border-primary" : "bg-card"
      }`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      {item.type === MediaType.YOUTUBE && (
        <Youtube className="w-4 h-4 text-red-500 flex-shrink-0" />
      )}
      {item.type === MediaType.MP4 && (
        <Video className="w-4 h-4 text-blue-500 flex-shrink-0" />
      )}
      {item.type === MediaType.IMAGE && (
        <ImageIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
      )}

      {item.thumb && (
        <img
          src={item.thumb}
          alt=""
          className="w-8 h-8 rounded object-cover flex-shrink-0"
        />
      )}

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {item.title || "Untitled"}
        </div>
        {(item.start || item.end) && (
          <div className="text-xs text-muted-foreground">
            {item.start && `Start: ${item.start}`}
            {item.start && item.end && " | "}
            {item.end && `End: ${item.end}`}
          </div>
        )}
      </div>

      <Button
        size="icon"
        variant="ghost"
        onClick={() => onEdit(item)}
        className="flex-shrink-0"
      >
        <Edit className="w-4 h-4" />
      </Button>

      <Button
        size="icon"
        variant="ghost"
        onClick={() => onDelete(item.id)}
        className="flex-shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

/**
 * Edit item dialog
 */
function EditItemDialog({
  item,
  onClose,
  onSave,
}: {
  item: MediaItem;
  onClose: () => void;
  onSave: (updates: any) => void;
}) {
  const isVideo = item.type === MediaType.YOUTUBE || item.type === MediaType.MP4;
  const isImage = item.type === MediaType.IMAGE;

  // Video fields
  const [startTime, setStartTime] = useState(item.start || "");
  const [endTime, setEndTime] = useState(item.end || "");

  // Image fields
  const [zoom, setZoom] = useState(item.zoom || 1.0);
  const [panX, setPanX] = useState(item.pan?.x || 0);
  const [panY, setPanY] = useState(item.pan?.y || 0);

  const handleSave = () => {
    const updates: any = {};

    if (isVideo) {
      if (startTime) updates.start = startTime;
      if (endTime) updates.end = endTime;
    }

    if (isImage) {
      updates.zoom = zoom;
      updates.pan = { x: panX, y: panY };
    }

    onSave(updates);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Media Item</DialogTitle>
          <DialogDescription>
            {item.title || "Untitled"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isVideo && (
            <>
              <div className="space-y-2">
                <Label htmlFor="start">Start Time (HH:MM:SS or MM:SS)</Label>
                <Input
                  id="start"
                  placeholder="00:00"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end">End Time (HH:MM:SS or MM:SS)</Label>
                <Input
                  id="end"
                  placeholder="01:30"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>

              <div className="text-sm text-muted-foreground">
                Leave blank to play the full video. Set both to loop a segment.
              </div>
            </>
          )}

          {isImage && (
            <>
              <div className="space-y-2">
                <Label>Zoom: {zoom.toFixed(2)}x</Label>
                <Slider
                  value={[zoom]}
                  onValueChange={([value]) => setZoom(value)}
                  min={0.1}
                  max={3}
                  step={0.1}
                />
              </div>

              <div className="space-y-2">
                <Label>Pan X: {panX.toFixed(0)}%</Label>
                <Slider
                  value={[panX]}
                  onValueChange={([value]) => setPanX(value)}
                  min={-100}
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <Label>Pan Y: {panY.toFixed(0)}%</Label>
                <Slider
                  value={[panY]}
                  onValueChange={([value]) => setPanY(value)}
                  min={-100}
                  max={100}
                  step={5}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
