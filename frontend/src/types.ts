export type TTSModel = "rime" | "elevenlabs" | "deepgram";

export type BenchmarkCategory =
  | "Normal"
  | "Stress"
  | "Cold"
  | "Warm"
  | "Warm-Hindi"
  | "Appointment"
  | "Fast"
  | "Technical"
  | "Elderly"
  | "Hindi"
  | "Disambiguation"
  | "Safety Critical"
  | "Stress: sound-alike"
  | "Stress: decimal dose"
  | "Stress: rapid list"
  | "Hindi-English"
  | string;

export interface ModelBenchmarkOutcome {
  ttfb: number;
  fidelityId: string;
  audioUrl?: string;
  transcribed?: string;
  accuracy?: number;
  fidelityStatus?: "completed" | "error";
  fidelityError?: string;
  status: string;
  error?: string;
}

export interface BenchmarkResult {
  sessionId: string;
  runId: string;
  results: {
    rime?: ModelBenchmarkOutcome;
    elevenlabs?: ModelBenchmarkOutcome;
    deepgram?: ModelBenchmarkOutcome;
  };
  timestamp: string;
}

export interface ReliabilityBenchmarkResult {
  sessionId: string;
  timestamp: string;
  runCount: number;
  runs: BenchmarkResult[];
}

export interface FidelityScore {
  model: string;
  status: "processing" | "completed" | "error";
  transcribed: string | null;
  accuracy: number | null;
  startedAt: string;
  completedAt: string | null;
  error?: string;
}

export const RELIABILITY_RUNS = 5;

export interface ModelRunData {
  model: string;
  ttfbValues: number[];
  avgTTFB: number;
  transcriptions: string[];
  uniqueTranscriptions: string[];
  determinism: number;
  accuracyValues: number[];
  avgAccuracy: number;
  successCount: number;
  failureCount: number;
  failureRate: number;
  appliedRunIds: string[];
  latestRunId: string;
  latestTtfb: number;
  latestAudioUrl: string | null;
  latestTranscription: string | null;
  latestAccuracy: number | null;
  textFidelityTranscription: string | null;
  textFidelityAccuracy: number | null;
  textFidelityStatus: FidelityScore["status"];
  latestFidelityStatus: FidelityScore["status"];
  latestError?: string;
}

export interface PromptResult {
  promptId: string;
  text: string;
  category: string;
  timestamp: string;
  runCount: number;
  reading?: boolean;
  models: Partial<Record<TTSModel, ModelRunData>>;
}

export interface SessionData {
  sessionId: string;
  createdAt: string;
  selectedModels: string[];
  prompts: PromptResult[];
}

export interface ControllabilityInfo {
  speed: string;
  speedOk: boolean;
  pronunciation: boolean;
  pronunciationNote: string;
  score: number;
}

export interface ModelSummaryMetrics {
  id: TTSModel;
  name: string;
  avgLatency: number;
  avgFidelity: number;
  avgDeterminism: number;
  failureRate: number;
  totalRuns: number;
  totalFailures: number;
  controllability: ControllabilityInfo;
  overallScore: number;
}

export interface ModelOption {
  id: TTSModel;
  name: string;
  isPrimary: boolean;
}
