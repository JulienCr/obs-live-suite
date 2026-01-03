"use client";
import { useState, useEffect } from "react";
import { Play, Trash2, Edit2, Save, X, Plus, RefreshCw } from "lucide-react";
import { getBackendUrl } from "@/lib/utils/websocket";
import { apiGet, apiPost, apiPut, apiDelete, isClientFetchError } from "@/lib/utils/ClientFetch";

interface Session {
  id: string;
  title: string;
  rounds: number;
  createdAt: string;
  path: string;
}

interface SessionManagerProps {
  onBuildNew?: () => void;
  onEditSession?: (sessionId: string) => void;
}

export function SessionManager({ onBuildNew, onEditSession }: SessionManagerProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await apiGet<{ sessions?: Session[] }>(`${getBackendUrl()}/api/quiz/sessions`);
      setSessions(data.sessions || []);

      // Get current session
      const stateData = await apiGet<{ session?: { id: string } }>(`${getBackendUrl()}/api/quiz/state`);
      setCurrentSessionId(stateData.session?.id || null);
    } catch (error) {
      if (isClientFetchError(error)) {
        console.error("Failed to fetch sessions:", error.errorMessage);
      } else {
        console.error("Failed to fetch sessions:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleLoad = async (sessionId: string) => {
    try {
      await apiPost(`${getBackendUrl()}/api/quiz/session/load`, { id: sessionId });
      setCurrentSessionId(sessionId);
      alert("Session loaded successfully!");
    } catch (error) {
      if (isClientFetchError(error)) {
        console.error("Failed to load session:", error.errorMessage);
      } else {
        console.error("Failed to load session:", error);
      }
      alert("Failed to load session");
    }
  };

  const handleDelete = async (sessionId: string, title: string) => {
    if (!confirm(`Delete session "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      await apiDelete(`${getBackendUrl()}/api/quiz/session/${sessionId}`);
      await fetchSessions();
    } catch (error) {
      if (isClientFetchError(error)) {
        console.error("Failed to delete session:", error.errorMessage);
      } else {
        console.error("Failed to delete session:", error);
      }
      alert("Failed to delete session");
    }
  };

  const handleSaveEdit = async (sessionId: string) => {
    try {
      await apiPut(`${getBackendUrl()}/api/quiz/session/${sessionId}`, { title: editTitle });
      setEditingId(null);
      setEditTitle("");
      await fetchSessions();
    } catch (error) {
      if (isClientFetchError(error)) {
        console.error("Failed to update session:", error.errorMessage);
      } else {
        console.error("Failed to update session:", error);
      }
      alert("Failed to update session");
    }
  };

  const handleSaveCurrent = async () => {
    try {
      await apiPost(`${getBackendUrl()}/api/quiz/session/save`, {});
      await fetchSessions();
      alert("Session saved successfully!");
    } catch (error) {
      if (isClientFetchError(error)) {
        console.error("Failed to save session:", error.errorMessage);
      } else {
        console.error("Failed to save session:", error);
      }
      alert("Failed to save session");
    }
  };

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500">Loading sessions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex gap-3">
        <button
          onClick={onBuildNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Build New Session
        </button>
        <button
          onClick={handleSaveCurrent}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          <Save className="w-4 h-4" />
          Save Current Session
        </button>
        <button
          onClick={fetchSessions}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 mb-4">No saved sessions yet</p>
          <button
            onClick={onBuildNew}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Your First Session
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`p-4 border rounded-lg ${
                session.id === currentSessionId
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {editingId === session.id ? (
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 px-3 py-1 border rounded"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(session.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                        title="Save"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditTitle("");
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{session.title}</h3>
                      {session.id === currentSessionId && (
                        <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded">
                          ACTIVE
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>{session.rounds} round{session.rounds !== 1 ? "s" : ""}</div>
                    <div>Created: {formatDate(session.createdAt)}</div>
                    <div className="text-xs text-gray-400 truncate">{session.id}</div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleLoad(session.id)}
                    className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    title="Load session"
                  >
                    <Play className="w-4 h-4" />
                    Load
                  </button>
                  <button
                    onClick={() => onEditSession?.(session.id)}
                    className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    title="Edit session content"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(session.id, session.title)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

