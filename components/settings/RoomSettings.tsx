"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Loader2,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  X,
  AlertCircle,
} from "lucide-react";
import { Room, CreateRoomInput, DEFAULT_ROOM_ID, DEFAULT_QUICK_REPLIES } from "@/lib/models/Room";
import { type StreamerbotConnectionSettings } from "@/lib/models/StreamerbotChat";
import { StreamerbotConnectionForm } from "./StreamerbotConnectionForm";

type FormMode = "create" | "edit" | null;

interface RoomFormData {
  name: string;
  vdoNinjaUrl: string;
  /** @deprecated Use streamerbotConnection instead */
  twitchChatUrl: string;
  quickReplies: string[];
  canSendCustomMessages: boolean;
  streamerbotConnection?: StreamerbotConnectionSettings;
}

const emptyFormData: RoomFormData = {
  name: "",
  vdoNinjaUrl: "",
  twitchChatUrl: "",
  quickReplies: [...DEFAULT_QUICK_REPLIES],
  canSendCustomMessages: false,
  streamerbotConnection: undefined,
};

/**
 * Room settings component for managing presenter rooms
 */
export function RoomSettings() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState<RoomFormData>(emptyFormData);
  const [newQuickReply, setNewQuickReply] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirmRoom, setDeleteConfirmRoom] = useState<Room | null>(null);
  const [actionResult, setActionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/presenter/rooms");
      const data = await res.json();
      if (data.rooms) {
        setRooms(data.rooms);
      }
    } catch (error) {
      console.error("Failed to load rooms:", error);
      setActionResult({
        success: false,
        message: "Failed to load rooms",
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setFormMode("create");
    setEditingRoom(null);
    setFormData(emptyFormData);
  };

  const openEditDialog = (room: Room) => {
    setFormMode("edit");
    setEditingRoom(room);
    setFormData({
      name: room.name,
      vdoNinjaUrl: room.vdoNinjaUrl || "",
      twitchChatUrl: room.twitchChatUrl || "",
      quickReplies: [...room.quickReplies],
      canSendCustomMessages: room.canSendCustomMessages || false,
      streamerbotConnection: room.streamerbotConnection,
    });
  };

  const closeDialog = () => {
    setFormMode(null);
    setEditingRoom(null);
    setFormData(emptyFormData);
    setNewQuickReply("");
  };

  const validateUrl = (url: string): boolean => {
    if (!url) return true; // Optional field
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      setActionResult({
        success: false,
        message: "Room name is required",
      });
      return;
    }

    if (formData.vdoNinjaUrl && !validateUrl(formData.vdoNinjaUrl)) {
      setActionResult({
        success: false,
        message: "VDO.Ninja URL is invalid",
      });
      return;
    }

    setSaving(true);
    setActionResult(null);

    try {
      if (formMode === "create") {
        // Create new room
        const createData: CreateRoomInput = {
          name: formData.name,
          vdoNinjaUrl: formData.vdoNinjaUrl || undefined,
          twitchChatUrl: formData.twitchChatUrl || undefined,
          quickReplies: formData.quickReplies,
          canSendCustomMessages: formData.canSendCustomMessages,
          streamerbotConnection: formData.streamerbotConnection,
        };

        const res = await fetch("/api/presenter/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createData),
        });

        const data = await res.json();

        if (data.room) {
          setActionResult({
            success: true,
            message: "Room created successfully!",
          });
          await loadRooms();
          closeDialog();
        } else {
          setActionResult({
            success: false,
            message: data.error || "Failed to create room",
          });
        }
      } else if (formMode === "edit" && editingRoom) {
        // Update existing room
        const updateData = {
          id: editingRoom.id,
          name: formData.name,
          vdoNinjaUrl: formData.vdoNinjaUrl || undefined,
          twitchChatUrl: formData.twitchChatUrl || undefined,
          quickReplies: formData.quickReplies,
          canSendCustomMessages: formData.canSendCustomMessages,
          streamerbotConnection: formData.streamerbotConnection,
        };

        const res = await fetch(`/api/presenter/rooms/${editingRoom.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });

        const data = await res.json();

        if (data.room) {
          setActionResult({
            success: true,
            message: "Room updated successfully!",
          });
          await loadRooms();
          closeDialog();
        } else {
          setActionResult({
            success: false,
            message: data.error || "Failed to update room",
          });
        }
      }
    } catch (error) {
      setActionResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to save room",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (room: Room) => {
    // Prevent deletion of default room
    if (room.id === DEFAULT_ROOM_ID) {
      setActionResult({
        success: false,
        message: "Cannot delete the default room",
      });
      return;
    }

    setSaving(true);
    setActionResult(null);

    try {
      const res = await fetch(`/api/presenter/rooms/${room.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        setActionResult({
          success: true,
          message: "Room deleted successfully!",
        });
        await loadRooms();
        setDeleteConfirmRoom(null);
      } else {
        setActionResult({
          success: false,
          message: data.error || "Failed to delete room",
        });
      }
    } catch (error) {
      setActionResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to delete room",
      });
    } finally {
      setSaving(false);
    }
  };

  const addQuickReply = () => {
    if (newQuickReply.trim() && !formData.quickReplies.includes(newQuickReply.trim())) {
      setFormData({
        ...formData,
        quickReplies: [...formData.quickReplies, newQuickReply.trim()],
      });
      setNewQuickReply("");
    }
  };

  const removeQuickReply = (index: number) => {
    setFormData({
      ...formData,
      quickReplies: formData.quickReplies.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading rooms...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Presenter Rooms</h2>
          <p className="text-sm text-muted-foreground">
            Configure presenter rooms with VDO.Ninja return video and Twitch chat integration
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Create Room
        </Button>
      </div>

      {/* Action Result Alert */}
      {actionResult && (
        <Alert variant={actionResult.success ? "default" : "destructive"}>
          <AlertDescription className="flex items-center gap-2">
            {actionResult.success ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {actionResult.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Rooms List */}
      {rooms.length === 0 ? (
        <Alert>
          <MessageSquare className="w-4 h-4" />
          <AlertDescription>
            No rooms configured yet. Create your first room to get started.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">{room.name}</h3>
                    {room.id === DEFAULT_ROOM_ID && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded">
                        Default
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-muted-foreground">VDO.Ninja URL:</span>{" "}
                      <span className="text-xs">
                        {room.vdoNinjaUrl ? (
                          <span className="text-green-600 dark:text-green-500">✓ Set</span>
                        ) : (
                          <span className="italic text-muted-foreground">Not configured</span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Streamer.bot:</span>{" "}
                      <span className="text-xs">
                        {room.streamerbotConnection ? (
                          <span className="text-green-600 dark:text-green-500">
                            ✓ {room.streamerbotConnection.host}:{room.streamerbotConnection.port}
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground">Not configured</span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quick Replies:</span>{" "}
                      <span className="text-xs">
                        {room.quickReplies.length > 0
                          ? room.quickReplies.join(", ")
                          : "None"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(room)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  {room.id !== DEFAULT_ROOM_ID && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirmRoom(room)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formMode !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formMode === "create" ? "Create New Room" : "Edit Room"}
            </DialogTitle>
            <DialogDescription>
              Configure the presenter room settings including video return and chat URLs
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Room Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Main Show Room"
                required
              />
            </div>

            {/* VDO.Ninja URL */}
            <div className="space-y-2">
              <Label htmlFor="vdoNinjaUrl">VDO.Ninja Return Video URL</Label>
              <Input
                id="vdoNinjaUrl"
                type="url"
                value={formData.vdoNinjaUrl}
                onChange={(e) => setFormData({ ...formData, vdoNinjaUrl: e.target.value })}
                placeholder="https://vdo.ninja/?view=..."
              />
              <p className="text-xs text-muted-foreground">
                Optional. Embedded iframe URL for return video feed.
              </p>
            </div>

            {/* Streamer.bot Connection */}
            <div className="space-y-2">
              <Label>Chat Connection (Streamer.bot)</Label>
              <StreamerbotConnectionForm
                value={formData.streamerbotConnection}
                onChange={(value) => setFormData({ ...formData, streamerbotConnection: value })}
                disabled={saving}
              />
            </div>

            {/* Quick Replies */}
            <div className="space-y-2">
              <Label>Quick Replies</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newQuickReply}
                    onChange={(e) => setNewQuickReply(e.target.value)}
                    placeholder="Add quick reply button"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addQuickReply();
                      }
                    }}
                  />
                  <Button type="button" onClick={addQuickReply} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {formData.quickReplies.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.quickReplies.map((reply, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 px-2 py-1 bg-accent rounded text-sm"
                      >
                        <span>{reply}</span>
                        <button
                          type="button"
                          onClick={() => removeQuickReply(index)}
                          className="hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Quick reply buttons shown to the presenter for fast responses.
                </p>
              </div>
            </div>

            {/* Custom Messages Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="canSendCustomMessages">Allow Custom Messages</Label>
                <Switch
                  id="canSendCustomMessages"
                  checked={formData.canSendCustomMessages}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, canSendCustomMessages: checked })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                When enabled, presenters can type and send custom reply messages.
                When disabled, only quick reply buttons are shown.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : formMode === "create" ? (
                "Create Room"
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmRoom !== null}
        onOpenChange={(open) => !open && setDeleteConfirmRoom(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Room?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmRoom?.name}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmRoom(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmRoom && handleDelete(deleteConfirmRoom)}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Room
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

