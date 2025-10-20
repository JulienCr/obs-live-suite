"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Upload, Image as ImageIcon } from "lucide-react";

interface Poster {
  id: string;
  title: string;
  fileUrl: string;
  type: "image" | "video";
  tags: string[];
  createdAt: string;
}

/**
 * Poster management component
 */
export function PosterManager() {
  const [posters, setPosters] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    fileUrl: "",
    type: "image" as "image" | "video",
    tags: [] as string[],
  });

  useEffect(() => {
    fetchPosters();
  }, []);

  const fetchPosters = async () => {
    try {
      const res = await fetch("/api/assets/posters");
      const data = await res.json();
      setPosters(data.posters || []);
    } catch (error) {
      console.error("Failed to fetch posters:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/assets/posters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        fetchPosters();
        setShowForm(false);
        setFormData({ title: "", fileUrl: "", type: "image", tags: [] });
      }
    } catch (error) {
      console.error("Failed to create poster:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this poster?")) return;
    
    try {
      await fetch(`/api/assets/posters/${id}`, { method: "DELETE" });
      fetchPosters();
    } catch (error) {
      console.error("Failed to delete poster:", error);
    }
  };

  if (loading) {
    return <div>Loading posters...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Posters</h2>
          <p className="text-sm text-muted-foreground">
            Manage images and videos for your shows
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Poster
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Alert>
          <AlertDescription>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Poster title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileUrl">File URL</Label>
                <Input
                  id="fileUrl"
                  value={formData.fileUrl}
                  onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                  placeholder="/assets/posters/my-poster.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  Place files in public/assets/posters/
                </p>
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <div className="flex gap-2">
                  <Button
                    variant={formData.type === "image" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({ ...formData, type: "image" })}
                  >
                    Image
                  </Button>
                  <Button
                    variant={formData.type === "video" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({ ...formData, type: "video" })}
                  >
                    Video
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={!formData.title || !formData.fileUrl}>
                  Create Poster
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Posters Grid */}
      {posters.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No posters yet</p>
          <p className="text-sm text-muted-foreground">
            Click "Add Poster" to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posters.map((poster) => (
            <div
              key={poster.id}
              className="border rounded-lg overflow-hidden group relative"
            >
              <div className="aspect-video bg-muted flex items-center justify-center">
                {poster.type === "image" ? (
                  <ImageIcon className="w-12 h-12 text-muted-foreground" />
                ) : (
                  <div className="text-muted-foreground">VIDEO</div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-medium truncate">{poster.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {poster.type}
                  </Badge>
                  {poster.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => handleDelete(poster.id)}
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

