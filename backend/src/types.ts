export type TTSModel = "rime" | "elevenlabs" | "deepgram";

export type BenchmarkCategory =
  | "Normal"
  | "Stress: sound-alike"
  | "Stress: decimal dose"
  | "Stress: rapid list"
  | "Hindi-English";

export interface TTSResult {
  audio: Buffer;
  ttfb: number;
  duration: number;
  status: "success" | "error";
  error?: string;
}

export interface BenchmarkRequest {
  text: string;
  selectedModels: TTSModel[];
  category: BenchmarkCategory;
  sessionId?: string;
}

export interface ModelBenchmarkOutcome {
  ttfb: number;
  fidelityId: string;
  audioUrl?: string;
  transcribed?: string;
  accuracy?: number;
  fidelityStatus?: "processing" | "completed" | "error";
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
  editDistance?: number;
  startedAt: string;
  completedAt: string | null;
  error?: string;
}

export interface StoreResultPayload {
  model: string;
  inputText: string;
  category: string;
  ttfb: number;
  audioPath: string;
  status: string;
}

export interface StoreFidelityPayload {
  transcribed?: string;
  accuracy?: number;
  editDistance?: number;
  status: string;
  error?: string;
}

export interface FidelityRow {
  runId: string;
  model: string;
  transcribedText: string | null;
  editDistance: number | null;
  accuracy: number | null;
  status: "processing" | "completed" | "error";
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}
