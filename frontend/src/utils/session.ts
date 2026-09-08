import type {
  BenchmarkResult,
  FidelityScore,
  ModelRunData,
  PromptResult,
  SessionData,
  TTSModel,
} from "../types";
import { RELIABILITY_RUNS } from "../types";

export const SESSION_STORAGE_KEY = "voxbench.sessionData";

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function normalizeTranscription(text: string): string {
  return text.toLowerCase().replace(/\p{P}/gu, "");
}

export function computeDeterminism(transcriptions: string[]): number {
  const sample = transcriptions.slice(-RELIABILITY_RUNS);
  const unique = new Set(sample.map(normalizeTranscription)).size;
  return 100 * (1 - unique / RELIABILITY_RUNS);
}

export function emptyModelRun(model: string): ModelRunData {
  return {
    model,
    ttfbValues: [],
    avgTTFB: 0,
    transcriptions: [],
    uniqueTranscriptions: [],
    determinism: 0,
    accuracyValues: [],
    avgAccuracy: 0,
    successCount: 0,
    failureCount: 0,
    failureRate: 0,
    appliedRunIds: [],
    latestRunId: "",
    latestTtfb: 0,
    latestAudioUrl: null,
    latestTranscription: null,
    latestAccuracy: null,
    textFidelityTranscription: null,
    textFidelityAccuracy: null,
    textFidelityStatus: "processing",
    latestFidelityStatus: "processing",
  };
}

export function createSession(selectedModels: string[]): SessionData {
  return {
    sessionId: "",
    createdAt: new Date().toISOString(),
    selectedModels,
    prompts: [],
  };
}

export function saveSession(session: SessionData) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error("Unable to save session data", error);
  }
}

export function loadSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionData;
  } catch (error) {
    console.error("Unable to load session data", error);
    return null;
  }
}

export function startReadingPrompt(
  prev: SessionData,
  promptText: string,
  category: string,
  selectedModels: string[]
): { session: SessionData; promptId: string } {
  const promptId = crypto.randomUUID();
  const prompt: PromptResult = {
    promptId,
    text: promptText.trim(),
    category,
    timestamp: new Date().toISOString(),
    runCount: 0,
    reading: false,
    models: {},
  };

  return {
    promptId,
    session: {
      ...prev,
      selectedModels,
      prompts: [prompt, ...prev.prompts],
    },
  };
}

export function applyBenchmarkBatch(
  prev: SessionData,
  promptId: string,
  promptText: string,
  category: string,
  selectedModels: string[],
  sessionId: string,
  runs: BenchmarkResult[]
): SessionData {
  const existing = prev.prompts.find((prompt) => prompt.promptId === promptId);
  const models: PromptResult["models"] = { ...(existing?.models ?? {}) };
  const runCount = Math.min(
    RELIABILITY_RUNS,
    (existing?.runCount ?? 0) + runs.length
  );

  for (const model of selectedModels) {
    const key = model as TTSModel;
    let current = models[key] ?? emptyModelRun(model);
    const modelRuns = runs.filter((run) => run.results[key]);

    for (const run of runs) {
      const outcome = run.results[key];
      if (!outcome) continue;
      if (outcome?.status === "success") {
        const ttfbValues = [...current.ttfbValues, outcome.ttfb];
        current = {
          ...current,
          ttfbValues,
          avgTTFB: average(ttfbValues),
          latestRunId: run.runId,
          latestTtfb: outcome.ttfb,
          latestAudioUrl: outcome.audioUrl ?? null,
          latestTranscription: null,
          latestAccuracy: null,
          latestFidelityStatus: "processing",
          latestError: undefined,
          failureRate: current.failureCount / Math.max(modelRuns.length, 1),
        };

        if (outcome.fidelityStatus === "completed" && outcome.transcribed !== undefined) {
          const isFirstFidelityResult =
            current.textFidelityStatus === "processing";
          const transcriptions = [
            ...current.transcriptions,
            outcome.transcribed ?? "",
          ];
          const accuracyValues = [
            ...current.accuracyValues,
            outcome.accuracy ?? 0,
          ];
          current = {
            ...current,
            transcriptions: transcriptions.slice(-RELIABILITY_RUNS),
            accuracyValues: accuracyValues.slice(-RELIABILITY_RUNS),
            avgAccuracy: average(accuracyValues),
            uniqueTranscriptions: [
              ...new Set(transcriptions.map(normalizeTranscription)),
            ],
            determinism: computeDeterminism(transcriptions),
            successCount: current.successCount + 1,
            appliedRunIds: [...current.appliedRunIds, run.runId],
            latestTranscription: outcome.transcribed ?? "",
            latestAccuracy: outcome.accuracy ?? null,
            latestFidelityStatus: "completed",
            textFidelityTranscription: isFirstFidelityResult
              ? outcome.transcribed
              : current.textFidelityTranscription,
            textFidelityAccuracy: isFirstFidelityResult
              ? outcome.accuracy ?? null
              : current.textFidelityAccuracy,
            textFidelityStatus: isFirstFidelityResult
              ? "completed"
              : current.textFidelityStatus,
          };
        } else if (outcome.fidelityStatus === "error") {
          const failureCount = current.failureCount + 1;
          current = {
            ...current,
            failureCount,
            failureRate: failureCount / Math.max(modelRuns.length, 1),
            appliedRunIds: [...current.appliedRunIds, run.runId],
            latestFidelityStatus: "error",
            latestError: outcome.fidelityError ?? "Fidelity failed",
            textFidelityStatus:
              current.textFidelityTranscription === null
                ? "error"
                : current.textFidelityStatus,
          };
        }
      } else {
        const failureCount = current.failureCount + 1;
        current = {
          ...current,
          failureCount,
          failureRate: failureCount / Math.max(modelRuns.length, 1),
          appliedRunIds: [...current.appliedRunIds, run.runId],
          latestRunId: run.runId,
          latestFidelityStatus: "error",
          latestError: outcome?.error || "Model run failed",
          textFidelityStatus:
            current.textFidelityStatus === "processing"
              ? "error"
              : current.textFidelityStatus,
        };
      }
    }

    models[key] = current;
  }

  const prompt: PromptResult = {
    promptId,
    text: promptText.trim(),
    category,
    timestamp: runs[runs.length - 1]?.timestamp ?? new Date().toISOString(),
    runCount,
    reading: false,
    models,
  };

  const prompts = prev.prompts.some((item) => item.promptId === promptId)
    ? prev.prompts.map((item) => (item.promptId === promptId ? prompt : item))
    : [...prev.prompts, prompt];

  return {
    ...prev,
    sessionId,
    selectedModels,
    prompts,
  };
}

export function applyFidelityResult(
  prev: SessionData,
  promptId: string,
  model: string,
  runId: string,
  result: FidelityScore
): SessionData {
  return {
    ...prev,
    prompts: prev.prompts.map((prompt) => {
      if (prompt.promptId !== promptId) return prompt;
      const current = prompt.models[model as TTSModel];
      if (!current || current.appliedRunIds.includes(runId)) return prompt;

      const transcription = result.transcribed ?? "";
      const transcriptions = [...current.transcriptions, transcription].slice(
        -RELIABILITY_RUNS
      );
      const accuracyValues = [
        ...current.accuracyValues,
        result.accuracy ?? 0,
      ].slice(-RELIABILITY_RUNS);
      const nextModel: ModelRunData = {
        ...current,
        transcriptions,
        accuracyValues,
        avgAccuracy: average(accuracyValues),
        uniqueTranscriptions: [
          ...new Set(transcriptions.map(normalizeTranscription)),
        ],
        determinism: computeDeterminism(transcriptions),
        successCount: current.successCount + 1,
        appliedRunIds: [...current.appliedRunIds, runId],
        latestTranscription: result.transcribed,
        latestAccuracy: result.accuracy,
        latestFidelityStatus: result.status,
        textFidelityTranscription:
          current.textFidelityTranscription ?? result.transcribed,
        textFidelityAccuracy:
          current.textFidelityAccuracy ?? result.accuracy,
        textFidelityStatus:
          current.textFidelityStatus === "processing"
            ? result.status
            : current.textFidelityStatus,
      };

      return {
        ...prompt,
        models: { ...prompt.models, [model]: nextModel },
      };
    }),
  };
}

export function markPromptIdle(prev: SessionData, promptId: string): SessionData {
  return {
    ...prev,
    prompts: prev.prompts.map((prompt) =>
      prompt.promptId === promptId ? { ...prompt, reading: false } : prompt
    ),
  };
}
