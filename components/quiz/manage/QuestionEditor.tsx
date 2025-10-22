"use client";
import { useEffect, useState } from "react";

interface QuestionEditorProps {
  questionId: string | null;
  onSave: () => void;
  onCancel: () => void;
}

export function QuestionEditor({ questionId, onSave, onCancel }: QuestionEditorProps) {
  const [type, setType] = useState<string>("qcm");
  const [text, setText] = useState("");
  const [media, setMedia] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState<number>(0);
  const [points, setPoints] = useState(10);
  const [timeS, setTimeS] = useState(20);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (questionId) {
      fetch(`/api/quiz/questions`)
        .then(r => r.json())
        .then(data => {
          const q = data.questions?.find((x: any) => x.id === questionId);
          if (q) {
            setType(q.type || "qcm");
            setText(q.text || "");
            setMedia(q.media || "");
            setOptions(q.options || ["", "", "", ""]);
            setCorrect(typeof q.correct === "number" ? q.correct : 0);
            setPoints(q.points || 10);
            setTimeS(q.time_s || 20);
          }
        });
    } else {
      // Reset for new question
      setType("qcm");
      setText("");
      setMedia("");
      setOptions(["", "", "", ""]);
      setCorrect(0);
      setPoints(10);
      setTimeS(20);
    }
  }, [questionId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/assets/quiz", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setMedia(data.url);
    } catch (err) {
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const payload: any = {
      type,
      text,
      media: media || null,
      points,
      time_s: timeS,
      tie_break: false,
    };

    if (type === "qcm" || type === "image") {
      payload.options = options.filter(o => o.trim());
      payload.correct = correct;
    }

    if (type === "closest") {
      payload.correct = 50; // Default target
    }

    try {
      const url = questionId
        ? `/api/quiz/questions/${questionId}`
        : "/api/quiz/questions";
      const method = questionId ? "PUT" : "POST";
      
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      onSave();
    } catch (err) {
      alert("Save failed");
    }
  };

  return (
    <div className="p-4 border rounded bg-white">
      <h3 className="text-lg font-semibold mb-4">{questionId ? "Edit" : "Create"} Question</h3>

      <div className="space-y-4">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="qcm">QCM (Text Options)</option>
            <option value="image">Image QCM</option>
            <option value="closest">Closest Number</option>
            <option value="open">Open Question</option>
          </select>
        </div>

        {/* Question Text */}
        <div>
          <label className="block text-sm font-medium mb-1">Question</label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="Enter question text"
          />
        </div>

        {/* Image Upload */}
        {(type === "image" || type === "closest") && (
          <div>
            <label className="block text-sm font-medium mb-1">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full border rounded px-3 py-2"
              disabled={uploading}
            />
            {media && (
              <div className="mt-2">
                <img src={media} alt="Preview" className="w-32 h-32 object-cover rounded" />
              </div>
            )}
          </div>
        )}

        {/* Options (QCM) */}
        {type === "qcm" && (
          <div>
            <label className="block text-sm font-medium mb-1">Options</label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="radio"
                  checked={correct === idx}
                  onChange={() => setCorrect(idx)}
                />
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...options];
                    newOpts[idx] = e.target.value;
                    setOptions(newOpts);
                  }}
                  className="flex-1 border rounded px-3 py-1"
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                />
              </div>
            ))}
          </div>
        )}

        {/* Points & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Points</label>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Time (s)</label>
            <input
              type="number"
              value={timeS}
              onChange={(e) => setTimeS(Number(e.target.value))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

