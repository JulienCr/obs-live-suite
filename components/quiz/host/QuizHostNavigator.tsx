"use client";

import { Session, Round, Question } from "@/lib/models/Quiz";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface NavigatorProps {
  session: Session | null;
  currentRoundIndex: number;
  currentQuestionIndex: number;
  onSelectQuestion: (questionId: string) => void;
  onStartRound: (roundIdx: number) => void;
  onEndRound: () => void;
  onUnloadSession?: () => void;
}

const QUESTION_TYPE_COLORS: Record<string, string> = {
  qcm: "text-blue-500",
  image: "text-green-500",
  closest: "text-orange-500",
  open: "text-purple-500",
};

const getRoundStatus = (
  round: Round,
  currentRoundIdx: number,
  roundIdx: number
): "not_started" | "live" | "done" => {
  if (roundIdx < currentRoundIdx) return "done";
  if (roundIdx === currentRoundIdx) return "live";
  return "not_started";
};

export function QuizHostNavigator({
  session,
  currentRoundIndex,
  currentQuestionIndex,
  onSelectQuestion,
  onStartRound,
  onEndRound,
  onUnloadSession,
}: NavigatorProps) {
  const t = useTranslations("quiz.host.navigator");
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(
    new Set([currentRoundIndex])
  );

  const getQuestionBadge = (phase: string): string => {
    if (phase === "reveal" || phase === "score_update") return t("questionBadge.revealed");
    if (phase === "lock") return t("questionBadge.locked");
    if (phase === "accept_answers") return t("questionBadge.accepting");
    return t("questionBadge.ready");
  };

  const toggleRound = (idx: number) => {
    const next = new Set(expandedRounds);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setExpandedRounds(next);
  };

  if (!session) {
    return (
      <aside className="w-80 border-r bg-gray-50 p-4">
        <p className="text-sm text-gray-500">{t("noSessionLoaded")}</p>
      </aside>
    );
  }

  return (
    <aside className="w-80 border-r bg-gray-50 overflow-y-auto">
      <div className="p-4 border-b bg-white sticky top-0">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">{session.title}</h2>
          {onUnloadSession && (
            <button
              onClick={onUnloadSession}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
              title={t("changeSession")}
            >
              {t("changeSession")}
            </button>
          )}
        </div>
      </div>

      <div className="p-2">
        {session.rounds.map((round, rIdx) => {
          const status = getRoundStatus(round, currentRoundIndex, rIdx);
          const isExpanded = expandedRounds.has(rIdx);
          const isActive = rIdx === currentRoundIndex;

          return (
            <div key={round.id} className="mb-2">
              <button
                onClick={() => toggleRound(rIdx)}
                className={cn(
                  "w-full flex items-center justify-between p-2 rounded hover:bg-gray-100",
                  isActive && "bg-blue-50 border border-blue-200"
                )}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <span className="font-medium text-sm">{round.title}</span>
                </div>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded",
                    status === "live" &&
                      "bg-green-100 text-green-700",
                    status === "done" && "bg-gray-200 text-gray-600",
                    status === "not_started" &&
                      "bg-yellow-100 text-yellow-700"
                  )}
                >
                  {status === "live" && t("roundStatus.live")}
                  {status === "done" && t("roundStatus.done")}
                  {status === "not_started" && t("roundStatus.notStarted")}
                </span>
              </button>

              {isExpanded && (
                <div className="ml-6 mt-1 space-y-1">
                  {round.questions.map((q, qIdx) => {
                    const isCurrentQ =
                      isActive && qIdx === currentQuestionIndex;
                    return (
                      <button
                        key={q.id}
                        onClick={() => onSelectQuestion(q.id)}
                        className={cn(
                          "w-full flex items-center justify-between p-1.5 text-xs rounded hover:bg-gray-100",
                          isCurrentQ && "bg-blue-100 border border-blue-300"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "font-mono",
                              QUESTION_TYPE_COLORS[q.type] || "text-gray-500"
                            )}
                          >
                            Q{qIdx + 1}
                          </span>
                          <span className="truncate max-w-[140px]">
                            {q.text}
                          </span>
                        </div>
                        <span className="text-xs px-1.5 py-0.5 bg-gray-200 rounded">
                          {getQuestionBadge(isCurrentQ ? "accept_answers" : "ready")}
                        </span>
                      </button>
                    );
                  })}

                  {isActive && (
                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={() => onStartRound(rIdx)}
                        className="flex-1 text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        {t("startRound")}
                      </button>
                      <button
                        onClick={onEndRound}
                        className="flex-1 text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        {t("endRound")}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

