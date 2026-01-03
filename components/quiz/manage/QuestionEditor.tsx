"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiGet, apiPost, apiPut, isClientFetchError } from "@/lib/utils/ClientFetch";

interface QuestionEditorProps {
  questionId: string | null;
  onSave: () => void;
  onCancel: () => void;
}

export function QuestionEditor({ questionId, onSave, onCancel }: QuestionEditorProps) {
  const t = useTranslations("quiz.manage.questionEditor");
  const [type, setType] = useState<string>("qcm");
  const [mode, setMode] = useState<string | undefined>(undefined);
  const [text, setText] = useState("");
  const [media, setMedia] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState<number>(0);
  const [points, setPoints] = useState(10);
  const [timeS, setTimeS] = useState(20);
  const [explanation, setExplanation] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (questionId) {
      apiGet<{ questions?: Array<{ id: string; type?: string; mode?: string; text?: string; media?: string; options?: string[]; correct?: number; points?: number; time_s?: number; explanation?: string; notes?: string }> }>("/api/quiz/questions")
        .then(data => {
          const q = data.questions?.find((x) => x.id === questionId);
          if (q) {
            setType(q.type || "qcm");
            setMode(q.mode || undefined);
            setText(q.text || "");
            setMedia(q.media || "");
            setOptions(q.options || ["", "", "", ""]);
            setCorrect(typeof q.correct === "number" ? q.correct : 0);
            setPoints(q.points || 10);
            setTimeS(q.time_s || 20);
            setExplanation(q.explanation || "");
            setNotes(q.notes || "");
          }
        })
        .catch((err) => {
          console.error("Failed to load question", err);
        });
    } else {
      // Reset for new question
      setType("qcm");
      setMode(undefined);
      setText("");
      setMedia("");
      setOptions(["", "", "", ""]);
      setCorrect(0);
      setPoints(10);
      setTimeS(20);
      setExplanation("");
      setNotes("");
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
      alert(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const payload: any = {
      type,
      mode: mode || undefined,
      text,
      media: media || null,
      points,
      time_s: timeS,
      tie_break: false,
      explanation: explanation || undefined,
      notes: notes || undefined,
    };

    if (type === "qcm" || type === "image") {
      payload.options = options.filter(o => o.trim());
      payload.correct = correct;
    }

    if (type === "closest") {
      payload.correct = 50; // Default target
    }

    try {
      if (questionId) {
        await apiPut(`/api/quiz/questions/${questionId}`, payload);
      } else {
        await apiPost("/api/quiz/questions", payload);
      }

      onSave();
    } catch (err) {
      if (isClientFetchError(err)) {
        console.error("Failed to save question:", err.errorMessage);
      }
      alert(t("saveFailed"));
    }
  };

  return (
    <div className="p-4 border rounded bg-white">
      <h3 className="text-lg font-semibold mb-4">{questionId ? t("editQuestion") : t("createQuestion")}</h3>

      <div className="space-y-4">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium mb-1">{t("type")}</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="qcm">{t("typeOptions.qcm")}</option>
            <option value="image">{t("typeOptions.image")}</option>
            <option value="closest">{t("typeOptions.closest")}</option>
            <option value="open">{t("typeOptions.open")}</option>
          </select>
        </div>

        {/* Mode (for image type) */}
        {type === "image" && (
          <div>
            <label className="block text-sm font-medium mb-1">{t("imageMode")}</label>
            <select
              value={mode || ""}
              onChange={(e) => setMode(e.target.value || undefined)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">{t("imageModeOptions.standard")}</option>
              <option value="image_zoombuzz">{t("imageModeOptions.zoomReveal")}</option>
              <option value="mystery_image">{t("imageModeOptions.mysteryImage")}</option>
            </select>
          </div>
        )}

        {/* Question Text */}
        <div>
          <label className="block text-sm font-medium mb-1">{t("question")}</label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder={t("questionPlaceholder")}
          />
        </div>

        {/* Image Upload */}
        {(type === "image" || type === "closest") && (
          <div>
            <label className="block text-sm font-medium mb-1">{t("image")}</label>
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
            <label className="block text-sm font-medium mb-1">{t("optionsLabel")}</label>
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
                  placeholder={t("optionPlaceholder", { letter: String.fromCharCode(65 + idx) })}
                />
              </div>
            ))}
          </div>
        )}

        {/* Points & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t("pointsLabel")}</label>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("timeLabel")}</label>
            <input
              type="number"
              value={timeS}
              onChange={(e) => setTimeS(Number(e.target.value))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        {/* Explanation */}
        <div>
          <label className="block text-sm font-medium mb-1">{t("explanationLabel")}</label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={3}
            placeholder={t("explanationPlaceholder")}
          />
          <p className="text-xs text-gray-500 mt-1">{t("explanationHelp")}</p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1">{t("notesLabel")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded px-3 py-2"
            rows={2}
            placeholder={t("notesPlaceholder")}
          />
          <p className="text-xs text-gray-500 mt-1">{t("notesHelp")}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}

