import sqlite3 from "sqlite3";
import * as path from "path";
import * as fs from "fs";
import {
  FidelityRow,
  StoreFidelityPayload,
  StoreResultPayload,
} from "../types";

const DB_PATH = path.join(process.cwd(), "db", "voxbench.db");

if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

export class SessionService {
  private db: sqlite3.Database;
  private ready: Promise<void>;

  constructor() {
    this.db = new sqlite3.Database(DB_PATH);
    this.ready = this.initializeSchema();
  }

  private run(sql: string, params: unknown[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T | undefined);
      });
    });
  }

  private all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve((rows as T[]) || []);
      });
    });
  }

  private async initializeSchema(): Promise<void> {
    await this.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY,
        sessionId TEXT UNIQUE NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY,
        sessionId TEXT NOT NULL,
        runId TEXT NOT NULL,
        inputText TEXT NOT NULL,
        category TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES sessions(sessionId),
        UNIQUE(runId)
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY,
        runId TEXT NOT NULL,
        model TEXT NOT NULL,
        ttfb INTEGER,
        audioPath TEXT,
        status TEXT DEFAULT 'success',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (runId) REFERENCES runs(runId),
        UNIQUE(runId, model)
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS fidelity (
        id INTEGER PRIMARY KEY,
        runId TEXT NOT NULL,
        model TEXT NOT NULL,
        transcribedText TEXT,
        editDistance INTEGER,
        accuracy REAL,
        status TEXT DEFAULT 'processing',
        error TEXT,
        startedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        completedAt DATETIME,
        FOREIGN KEY (runId) REFERENCES runs(runId),
        UNIQUE(runId, model)
      )
    `);
  }

  async createSession(sessionId: string): Promise<void> {
    await this.ready;
    await this.run("INSERT OR IGNORE INTO sessions (sessionId) VALUES (?)", [
      sessionId,
    ]);
  }

  async storeResult(
    sessionId: string,
    runId: string,
    data: StoreResultPayload
  ): Promise<void> {
    await this.ready;
    await this.createSession(sessionId);

    await this.run(
      "INSERT OR IGNORE INTO runs (sessionId, runId, inputText, category) VALUES (?, ?, ?, ?)",
      [sessionId, runId, data.inputText, data.category]
    );

    await this.run(
      "INSERT OR REPLACE INTO results (runId, model, ttfb, audioPath, status) VALUES (?, ?, ?, ?, ?)",
      [runId, data.model, data.ttfb, data.audioPath, data.status]
    );

    await this.run(
      "INSERT OR IGNORE INTO fidelity (runId, model, status) VALUES (?, ?, ?)",
      [runId, data.model, "processing"]
    );
  }

  async storeFidelity(
    _sessionId: string,
    runId: string,
    model: string,
    data: StoreFidelityPayload
  ): Promise<void> {
    await this.ready;
    await this.run(
      `UPDATE fidelity
       SET transcribedText = ?, accuracy = ?, editDistance = ?, status = ?, error = ?, completedAt = CURRENT_TIMESTAMP
       WHERE runId = ? AND model = ?`,
      [
        data.transcribed ?? null,
        data.accuracy ?? null,
        data.editDistance ?? null,
        data.status,
        data.error ?? null,
        runId,
        model,
      ]
    );
  }

  async getFidelity(
    _sessionId: string,
    runId: string,
    model: string
  ): Promise<FidelityRow | undefined> {
    await this.ready;
    return this.get<FidelityRow>(
      "SELECT * FROM fidelity WHERE runId = ? AND model = ?",
      [runId, model]
    );
  }
}

export const sessionService = new SessionService();
