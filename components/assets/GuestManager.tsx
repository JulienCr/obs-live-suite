"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AvatarUploader } from "./AvatarUploader";
import { Plus, Trash2, Edit, User, Zap } from "lucide-react";

interface Guest {
  id: string;
  displayName: string;
  subtitle?: string;
  accentColor: string;
  avatarUrl?: string;
  createdAt: string;
}

/**
 * Guest management component
 */
export function GuestManager() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    displayName: "",
    subtitle: "",
    accentColor: "#3b82f6",
    avatarUrl: "",
  });

  useEffect(() => {
    fetchGuests();
  }, []);

  const fetchGuests = async () => {
    try {
      const res = await fetch("/api/assets/guests");
      const data = await res.json();
      setGuests(data.guests || []);
    } catch (error) {
      console.error("Failed to fetch guests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        // Update existing guest
        console.log("[GuestManager] Updating guest with data:", formData);
        const res = await fetch(`/api/assets/guests/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        
        if (res.ok) {
          fetchGuests();
          setShowForm(false);
          setEditingId(null);
          setFormData({
            displayName: "",
            subtitle: "",
            accentColor: "#3b82f6",
            avatarUrl: "",
          });
        }
      } else {
        // Create new guest
        console.log("[GuestManager] Creating new guest with data:", formData);
        const res = await fetch("/api/assets/guests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        
        if (res.ok) {
          const result = await res.json();
          console.log("[GuestManager] Guest created successfully:", result);
          fetchGuests();
          setShowForm(false);
          setFormData({
            displayName: "",
            subtitle: "",
            accentColor: "#3b82f6",
            avatarUrl: "",
          });
        } else {
          const error = await res.json();
          console.error("[GuestManager] Failed to create guest:", error);
        }
      }
    } catch (error) {
      console.error("Failed to save guest:", error);
    }
  };

  const handleEdit = (guest: Guest) => {
    setEditingId(guest.id);
    setFormData({
      displayName: guest.displayName,
      subtitle: guest.subtitle || "",
      accentColor: guest.accentColor,
      avatarUrl: guest.avatarUrl || "",
    });
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      displayName: "",
      subtitle: "",
      accentColor: "#3b82f6",
      avatarUrl: "",
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this guest?")) return;
    
    try {
      await fetch(`/api/assets/guests/${id}`, { method: "DELETE" });
      fetchGuests();
    } catch (error) {
      console.error("Failed to delete guest:", error);
    }
  };

  const handleQuickLowerThird = async (guest: Guest) => {
    try {
      // Send lower third with auto-hide after 8 seconds
      await fetch("/api/overlays/lower", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "show",
          payload: {
            title: guest.displayName,
            subtitle: guest.subtitle || "",
            side: "left",
            duration: 8, // Auto-hide after 8 seconds
            avatarUrl: guest.avatarUrl,
            accentColor: guest.accentColor,
          },
        }),
      });
    } catch (error) {
      console.error("Failed to show lower third:", error);
    }
  };

  if (loading) {
    return <div>Loading guests...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Guests</h2>
          <p className="text-sm text-muted-foreground">
            Manage guest profiles for lower thirds
          </p>
        </div>
        <Button onClick={() => {
          setEditingId(null);
          setFormData({
            displayName: "",
            subtitle: "",
            accentColor: "#3b82f6",
            avatarUrl: "",
          });
          setShowForm(!showForm);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Guest
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Alert>
          <AlertDescription>
            <div className="space-y-4 mt-2">
              <h3 className="font-medium">{editingId ? "Edit Guest" : "Create Guest"}</h3>
              
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={formData.subtitle}
                  onChange={(e) =>
                    setFormData({ ...formData, subtitle: e.target.value })
                  }
                  placeholder="CEO, Company Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={formData.accentColor}
                    onChange={(e) =>
                      setFormData({ ...formData, accentColor: e.target.value })
                    }
                    className="w-20"
                  />
                  <Input
                    value={formData.accentColor}
                    onChange={(e) =>
                      setFormData({ ...formData, accentColor: e.target.value })
                    }
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Avatar (Optional)</Label>
                <AvatarUploader
                  currentAvatar={formData.avatarUrl}
                  onUpload={(url) => setFormData({ ...formData, avatarUrl: url })}
                  accentColor={formData.accentColor}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={!formData.displayName}
                >
                  {editingId ? "Update Guest" : "Create Guest"}
                </Button>
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Guests List */}
      {guests.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No guests yet</p>
          <p className="text-sm text-muted-foreground">
            Click "Add Guest" to get started
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {guests.map((guest) => (
            <div
              key={guest.id}
              className="border rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden"
                  style={{ backgroundColor: guest.accentColor }}
                >
                  {guest.avatarUrl ? (
                    <img
                      src={guest.avatarUrl}
                      alt={guest.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    guest.displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="font-medium">{guest.displayName}</h3>
                  {guest.subtitle && (
                    <p className="text-sm text-muted-foreground">
                      {guest.subtitle}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleQuickLowerThird(guest)}
                  title="Show Lower Third (8s auto-hide)"
                >
                  <Zap className="w-3 h-3 mr-2" />
                  Quick LT
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleEdit(guest)}
                >
                  <Edit className="w-3 h-3 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(guest.id)}
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

