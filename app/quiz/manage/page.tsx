"use client";
import { useState } from "react";
import { QuestionList } from "@/components/quiz/manage/QuestionList";
import { QuestionEditor } from "@/components/quiz/manage/QuestionEditor";
import { SessionManager } from "@/components/quiz/manage/SessionManager";
import { SessionBuilder } from "@/components/quiz/manage/SessionBuilder";

type TabType = "questions" | "sessions" | "builder";

export default function QuizManagePage() {
  const [activeTab, setActiveTab] = useState<TabType>("questions");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Quiz Manager</h1>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab("questions")}
          className={`px-4 py-2 font-medium ${
            activeTab === "questions"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Questions
        </button>
        <button
          onClick={() => setActiveTab("sessions")}
          className={`px-4 py-2 font-medium ${
            activeTab === "sessions"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Sessions
        </button>
        {activeTab === "builder" && (
          <button
            onClick={() => setActiveTab("builder")}
            className="px-4 py-2 font-medium border-b-2 border-blue-600 text-blue-600"
          >
            Session Builder
          </button>
        )}
      </div>

      {/* Questions Tab */}
      {activeTab === "questions" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Questions</h2>
              <button
                onClick={() => { setIsCreating(true); setEditingId(null); }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + New Question
              </button>
            </div>
            <QuestionList onEdit={(id) => { setEditingId(id); setIsCreating(false); }} />
          </div>

          <div>
            {(isCreating || editingId) && (
              <QuestionEditor
                questionId={editingId}
                onSave={() => { setIsCreating(false); setEditingId(null); }}
                onCancel={() => { setIsCreating(false); setEditingId(null); }}
              />
            )}
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === "sessions" && (
        <SessionManager 
          onBuildNew={() => {
            setEditingSessionId(null);
            setActiveTab("builder");
          }}
          onEditSession={(sessionId) => {
            setEditingSessionId(sessionId);
            setActiveTab("builder");
          }}
        />
      )}

      {/* Session Builder Tab */}
      {activeTab === "builder" && (
        <SessionBuilder 
          sessionId={editingSessionId || undefined}
          onBack={() => {
            setEditingSessionId(null);
            setActiveTab("sessions");
          }}
        />
      )}
    </div>
  );
}

