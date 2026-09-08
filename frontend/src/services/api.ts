import type {
  BenchmarkCategory,
  FidelityScore,
  ReliabilityBenchmarkResult,
} from "../types";

const API_BASE = "http://localhost:5000/api";

export function getAudioUrl(audioUrl: string): string {
  return audioUrl.startsWith("http")
    ? audioUrl
    : `${API_BASE.replace(/\/api$/, "")}${audioUrl}`;
}

export async function runBenchmark(
  text: string,
  selectedModels: string[],
  category: string,
  sessionId?: string
): Promise<ReliabilityBenchmarkResult> {
  const response = await fetch(`${API_BASE}/benchmark/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      selectedModels,
      category: category as BenchmarkCategory,
      ...(sessionId ? { sessionId } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Benchmark failed: ${response.statusText}`);
  }

  const payload = await response.json();
  if (Array.isArray(payload.runs)) {
    return payload as ReliabilityBenchmarkResult;
  }

  return {
    sessionId: payload.sessionId,
    timestamp: payload.timestamp,
    runCount: 1,
    runs: [payload],
  };
}

export async function runReliability(
  text: string,
  selectedModels: string[],
  category: string,
  sessionId: string
): Promise<ReliabilityBenchmarkResult> {
  const response = await fetch(`${API_BASE}/benchmark/reliability`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      selectedModels,
      category: category as BenchmarkCategory,
      sessionId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Reliability benchmark failed: ${response.statusText}`);
  }

  return response.json();
}

export async function getFidelityScore(
  sessionId: string,
  runId: string,
  model: string
): Promise<FidelityScore> {
  const response = await fetch(
    `${API_BASE}/fidelity/${sessionId}/${runId}/${model}`
  );

  if (!response.ok) {
    throw new Error(`Fidelity fetch failed: ${response.statusText}`);
  }

  return response.json();
}

export async function getHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE.replace("/api", "")}/health`);

  if (!response.ok) {
    throw new Error("Backend health check failed");
  }

  return response.json();
}
