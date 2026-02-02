import { randomUUID } from "crypto";
import { writeFile, readFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { Logger } from "../utils/Logger";
import { PathManager } from "../config/PathManager";
import { GuestRepository } from "@/lib/repositories/GuestRepository";
import { Session, sessionSchema, Player, QuizConfig, Question, questionSchema, Round, roundSchema } from "../models/Quiz";

/**
 * QuizStore maintains in-memory quiz session and provides optional JSON persistence.
 * Also manages question bank.
 */
export class QuizStore {
  private static instance: QuizStore;
  private logger: Logger;
  private session: Session | null;
  private questionBank: Map<string, Question>;
  private roundBank: Map<string, Round>;
  // Mutex to prevent concurrent file writes that corrupt questions.json
  private savePromise: Promise<void> | null = null;
  private pendingSave: boolean = false;

  private constructor() {
    this.logger = new Logger("QuizStore");
    this.session = null;
    this.questionBank = new Map();
    this.roundBank = new Map();
    // Note: Retry logic could be beneficial here if file system is temporarily unavailable
    this.loadQuestionBank().catch((error) => {
      this.logger.error('Failed to load question bank on initialization', error);
    });
  }

  static getInstance(): QuizStore {
    if (!QuizStore.instance) {
      QuizStore.instance = new QuizStore();
    }
    return QuizStore.instance;
  }

  getSession(): Session | null {
    return this.session;
  }

  setSession(session: Session): void {
    this.session = sessionSchema.parse(session);
  }

  ensurePlayersFromGuests(): Player[] {
    const guestRepo = GuestRepository.getInstance();
    const guests = guestRepo.getAll().slice(0, 4);
    const players: Player[] = guests.map((g) => ({
      id: g.id,
      displayName: g.displayName,
      avatarUrl: g.avatarUrl || undefined,
      accentColor: g.accentColor || undefined,
    }));
    return players;
  }

  createDefaultSession(config?: Partial<QuizConfig>): Session {
    const players = this.ensurePlayersFromGuests();
    const sess: Session = sessionSchema.parse({
      id: randomUUID(),
      title: "Quiz Session",
      rounds: [],
      currentRoundIndex: 0,
      currentQuestionIndex: 0,
      players,
      config: {
        closest_k: 1,
        time_defaults: { qcm: 20, image: 20, closest: 20, open: 30 },
        viewers_weight: 1,
        players_weight: 1,
        allow_multiple_attempts: false,
        first_or_last_wins: "last",
        topN: 10,
        viewers: { allow_answers_in_zoombuzz: false },
        ...config,
      },
      scores: { players: {}, viewers: {} },
      scorePanelVisible: true,
    });
    this.session = sess;
    return sess;
  }

  addScorePlayer(playerId: string, delta: number): number {
    const sess = this.requireSession();
    const cur = sess.scores.players[playerId] || 0;
    const next = cur + delta;
    sess.scores.players[playerId] = next;
    return next;
  }

  addScoreViewer(userId: string, delta: number): number {
    const sess = this.requireSession();
    const cur = sess.scores.viewers[userId] || 0;
    const next = cur + delta;
    sess.scores.viewers[userId] = next;
    return next;
  }

  getLeaderboardPlayers(topN: number): Array<{ id: string; name: string; score: number }> {
    const sess = this.requireSession();
    const entries = Object.entries(sess.scores.players).map(([id, score]) => {
      const p = sess.players.find((x) => x.id === id);
      return { id, name: p?.displayName || id, score };
    });
    return entries.sort((a, b) => b.score - a.score).slice(0, topN);
  }

  private requireSession(): Session {
    if (!this.session) throw new Error("No active session");
    return this.session;
  }

  async saveToFile(id?: string): Promise<string> {
    if (!this.session) throw new Error("No active session");
    const pm = PathManager.getInstance();
    const filename = `${id || this.session.id}.json`;
    const filepath = join(pm.getQuizSessionsDir(), filename);
    await writeFile(filepath, JSON.stringify(this.session, null, 2), "utf-8");
    this.logger.info(`Saved quiz session to ${filepath}`);
    return filepath;
  }

  async loadFromFile(fileId: string): Promise<Session> {
    const pm = PathManager.getInstance();
    const filepath = join(pm.getQuizSessionsDir(), `${fileId}.json`);
    const content = await readFile(filepath, "utf-8");
    const data = JSON.parse(content);
    // Ensure scorePanelVisible defaults to true if not present
    if (data.scorePanelVisible === undefined) {
      data.scorePanelVisible = true;
    }
    const parsed = sessionSchema.parse(data);
    this.session = parsed;
    return parsed;
  }

  async listSessions(): Promise<Array<{ id: string; title: string; rounds: number; createdAt: string; path: string }>> {
    const pm = PathManager.getInstance();
    const sessionsDir = pm.getQuizSessionsDir();
    
    if (!existsSync(sessionsDir)) {
      return [];
    }

    const fs = await import("fs/promises");
    const files = await fs.readdir(sessionsDir);
    const sessions = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const filepath = join(sessionsDir, file);
          const content = await readFile(filepath, "utf-8");
          const parsed = JSON.parse(content);
          const stats = await fs.stat(filepath);
          
          sessions.push({
            id: parsed.id || file.replace(".json", ""),
            title: parsed.title || "Untitled",
            rounds: parsed.rounds?.length || 0,
            createdAt: stats.mtime.toISOString(),
            path: filepath,
          });
        } catch (e) {
          this.logger.warn(`Failed to parse session file ${file}`, e);
        }
      }
    }

    return sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async deleteSession(sessionId: string): Promise<void> {
    const pm = PathManager.getInstance();
    const filepath = join(pm.getQuizSessionsDir(), `${sessionId}.json`);
    
    if (!existsSync(filepath)) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const fs = await import("fs/promises");
    await fs.unlink(filepath);
    this.logger.info(`Deleted session ${sessionId}`);
  }

  async updateSessionMetadata(sessionId: string, updates: { title?: string }): Promise<Session> {
    const pm = PathManager.getInstance();
    const filepath = join(pm.getQuizSessionsDir(), `${sessionId}.json`);
    const content = await readFile(filepath, "utf-8");
    const parsed = sessionSchema.parse(JSON.parse(content));
    
    if (updates.title !== undefined) {
      parsed.title = updates.title;
    }
    
    await writeFile(filepath, JSON.stringify(parsed, null, 2), "utf-8");
    this.logger.info(`Updated session ${sessionId} metadata`);
    
    // If this is the current session, update it in memory
    if (this.session?.id === sessionId) {
      this.session = parsed;
    }
    
    return parsed;
  }

  // Question Bank CRUD
  createQuestion(q: Omit<Question, "id">): Question {
    const question = questionSchema.parse({ ...q, id: randomUUID() });
    this.questionBank.set(question.id, question);
    // Note: Retry logic could be beneficial here to ensure data persistence
    this.saveQuestionBank().catch((error) => {
      this.logger.error('Failed to save question bank after creating question', error);
    });
    return question;
  }

  getQuestion(id: string): Question | undefined {
    return this.questionBank.get(id);
  }

  getAllQuestions(): Question[] {
    return Array.from(this.questionBank.values());
  }

  updateQuestion(id: string, updates: Partial<Question>): Question {
    const existing = this.questionBank.get(id);
    if (!existing) throw new Error("Question not found");
    const updated = questionSchema.parse({ ...existing, ...updates, id });
    this.questionBank.set(id, updated);
    // Note: Retry logic could be beneficial here to ensure data persistence
    this.saveQuestionBank().catch((error) => {
      this.logger.error('Failed to save question bank after updating question', error);
    });
    return updated;
  }

  deleteQuestion(id: string): void {
    this.questionBank.delete(id);
    // Note: Retry logic could be beneficial here to ensure data persistence
    this.saveQuestionBank().catch((error) => {
      this.logger.error('Failed to save question bank after deleting question', error);
    });
  }

  // Round Bank CRUD
  createRound(r: Omit<Round, "id">): Round {
    const round = roundSchema.parse({ ...r, id: randomUUID() });
    this.roundBank.set(round.id, round);
    return round;
  }

  getRound(id: string): Round | undefined {
    return this.roundBank.get(id);
  }

  getAllRounds(): Round[] {
    return Array.from(this.roundBank.values());
  }

  updateRound(id: string, updates: Partial<Round>): Round {
    const existing = this.roundBank.get(id);
    if (!existing) throw new Error("Round not found");
    const updated = roundSchema.parse({ ...existing, ...updates, id });
    this.roundBank.set(id, updated);
    return updated;
  }

  deleteRound(id: string): void {
    this.roundBank.delete(id);
  }

  private async loadQuestionBank(): Promise<void> {
    const pm = PathManager.getInstance();
    const filepath = join(pm.getQuizDir(), "questions.json");
    if (!existsSync(filepath)) return;
    try {
      const content = await readFile(filepath, "utf-8");
      const data = JSON.parse(content);
      if (Array.isArray(data.questions)) {
        for (const q of data.questions) {
          const parsed = questionSchema.parse(q);
          this.questionBank.set(parsed.id, parsed);
        }
      }
    } catch (e) {
      // Handle JSON parse errors specifically with clear error message
      if (e instanceof SyntaxError) {
        this.logger.error(
          `Malformed JSON in questions.json at ${filepath}. Initializing with empty question bank.`,
          e
        );
      } else {
        this.logger.error(`Failed to load question bank from ${filepath}`, e);
      }
      // Ensure question bank is initialized empty on failure (it already is from constructor)
      this.questionBank.clear();
    }
  }

  /**
   * Save question bank to disk with mutex to prevent concurrent writes.
   * Uses a coalescing pattern: if a save is in progress, marks pendingSave
   * and waits for the current save to complete, then triggers one more save.
   */
  private async saveQuestionBank(): Promise<void> {
    // If a save is already in progress, mark that we need another save and wait
    if (this.savePromise) {
      this.pendingSave = true;
      await this.savePromise;
      return;
    }

    const doSave = async (): Promise<void> => {
      const pm = PathManager.getInstance();
      const filepath = join(pm.getQuizDir(), "questions.json");
      const data = { questions: Array.from(this.questionBank.values()) };
      await writeFile(filepath, JSON.stringify(data, null, 2), "utf-8");
    };

    try {
      this.savePromise = doSave();
      await this.savePromise;
    } finally {
      this.savePromise = null;
      // If another save was requested while we were saving, do one more save
      if (this.pendingSave) {
        this.pendingSave = false;
        await this.saveQuestionBank();
      }
    }
  }
}


