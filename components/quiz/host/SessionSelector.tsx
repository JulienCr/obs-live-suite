"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Plus, RefreshCw, Calendar, Users } from "lucide-react";
import Link from "next/link";
import { getBackendUrl } from "@/lib/utils/websocket";
import { apiGet } from "@/lib/utils/ClientFetch";

interface SessionMeta {
  id: string;
  title: string;
  rounds: number;
  createdAt: string;
}

interface SessionSelectorProps {
  onLoadSession: (sessionId: string) => void;
}

export function SessionSelector({ onLoadSession }: SessionSelectorProps) {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ sessions?: SessionMeta[] }>(
        `${getBackendUrl()}/api/quiz/sessions`
      );
      setSessions(data.sessions || []);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quiz Host Panel
          </h1>
          <p className="text-gray-600">
            Select a session to start hosting, or create a new one
          </p>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No sessions found
            </h3>
            <p className="text-gray-500 mb-6">
              Create your first quiz session to get started
            </p>
            <Link href="/quiz/manage">
              <Button size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Create New Session
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {session.title}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {session.rounds} round{session.rounds !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(session.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      onClick={() => onLoadSession(session.id)}
                      className="ml-4"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Load Session
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={fetchSessions}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh List
              </Button>
              <Link href="/quiz/manage">
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Session
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

