import type {
  ControllabilityInfo,
  ModelSummaryMetrics,
  SessionData,
  TTSModel,
} from "../types";
import { average } from "./session";

export const MODEL_NAMES: Record<TTSModel, string> = {
  rime: "Rime",
  elevenlabs: "ElevenLabs",
  deepgram: "Deepgram",
};

export const CONTROLLABILITY: Record<TTSModel, ControllabilityInfo> = {
  rime: {
    speed: "0.5x to 2.0x",
    speedOk: true,
    pronunciation: true,
    pronunciationNote: "Most controllable",
    score: 100,
  },
  elevenlabs: {
    speed: "0.7x to 1.2x",
    speedOk: true,
    pronunciation: true,
    pronunciationNote: "Moderately controllable",
    score: 75,
  },
  deepgram: {
    speed: "0.7x to 1.5x",
    speedOk: true,
    pronunciation: true,
    pronunciationNote: "Less controllable than Rime",
    score: 60,
  },
};

const ALL_MODELS: TTSModel[] = ["rime", "elevenlabs", "deepgram"];

export function aggregateSession(session: SessionData): ModelSummaryMetrics[] {
  const selected = (session.selectedModels.length
    ? session.selectedModels
    : ALL_MODELS) as TTSModel[];

  const raw = selected.map((id) => {
    const promptStats = session.prompts
      .map((prompt) => prompt.models[id])
      .filter((model) => Boolean(model));

    const avgLatency = average(
      promptStats.map((model) => model!.avgTTFB).filter((value) => value > 0)
    );
    const avgFidelity = average(
      promptStats.map((model) => model!.avgAccuracy).filter((value) => value > 0)
    );
    const determinismSamples = promptStats.filter(
      (model) => model!.transcriptions.length >= 5
    );
    const avgDeterminism = average(
      (determinismSamples.length ? determinismSamples : promptStats).map(
        (model) => model!.determinism
      )
    );
    const totalFailures = promptStats.reduce(
      (sum, model) => sum + (model?.failureCount ?? 0),
      0
    );
    const totalRuns = session.prompts.reduce((sum, prompt) => {
      const model = prompt.models[id];
      if (!model) return sum;
      return sum + prompt.runCount;
    }, 0);

    return {
      id,
      name: MODEL_NAMES[id],
      avgLatency,
      avgFidelity,
      avgDeterminism,
      failureRate: totalRuns > 0 ? totalFailures / totalRuns : 0,
      totalRuns,
      totalFailures,
      controllability: CONTROLLABILITY[id],
      overallScore: 0,
    };
  });

  const latencies = raw
    .map((model) => model.avgLatency)
    .filter((value) => value > 0);
  const bestLatency = latencies.length ? Math.min(...latencies) : 0;

  return raw.map((model) => {
    const latencyScore =
      model.avgLatency > 0 && bestLatency > 0
        ? 100 * (bestLatency / model.avgLatency)
        : 0;
    const fidelityScore = model.avgFidelity;
    const reliabilityScore =
      0.6 * model.avgDeterminism + 0.4 * (100 * (1 - model.failureRate));
    const overallScore =
      latencyScore * 0.25 +
      fidelityScore * 0.3 +
      reliabilityScore * 0.25 +
      model.controllability.score * 0.2;

    return { ...model, overallScore };
  });
}

export function generateInsights(metrics: ModelSummaryMetrics[]): string[] {
  const withData = metrics.filter((model) => model.totalRuns > 0);
  if (withData.length === 0) {
    return ["Run at least one prompt to generate insights."];
  }

  const insights: string[] = [];
  const fastest = [...withData].sort((a, b) => a.avgLatency - b.avgLatency)[0];
  const bestFidelity = [...withData].sort(
    (a, b) => b.avgFidelity - a.avgFidelity
  )[0];
  const worstFailure = [...withData].sort(
    (a, b) => b.failureRate - a.failureRate
  )[0];
  const mostConsistent = [...withData].sort(
    (a, b) => b.avgDeterminism - a.avgDeterminism
  )[0];
  const mostVariable = [...withData].sort(
    (a, b) => a.avgDeterminism - b.avgDeterminism
  )[0];

  insights.push(
    `${fastest.name} is the fastest with the lowest latency (${Math.round(fastest.avgLatency)} ms).`
  );

  if (bestFidelity.avgFidelity >= 99.5) {
    insights.push(
      `${bestFidelity.name} achieved perfect text fidelity (${Math.round(bestFidelity.avgFidelity)}%).`
    );
  } else {
    insights.push(
      `${bestFidelity.name} has the highest text fidelity (${bestFidelity.avgFidelity.toFixed(1)}%).`
    );
  }

  if (worstFailure.failureRate > 0) {
    insights.push(
      `${worstFailure.name} has a higher failure rate (${(worstFailure.failureRate * 100).toFixed(1)}%).`
    );
  } else {
    insights.push("All models completed without failures in this session.");
  }

  if (mostVariable.avgDeterminism < 80) {
    insights.push(
      `${mostVariable.name} shows the highest variability (determinism: ${mostVariable.avgDeterminism.toFixed(0)}%).`
    );
  } else {
    insights.push(
      `${mostConsistent.name} is the most consistent (determinism: ${mostConsistent.avgDeterminism.toFixed(0)}%).`
    );
  }

  return insights;
}

export function pickBestOverall(
  metrics: ModelSummaryMetrics[]
): ModelSummaryMetrics | null {
  const withData = metrics.filter((model) => model.totalRuns > 0);
  if (withData.length === 0) return null;
  return [...withData].sort((a, b) => b.overallScore - a.overallScore)[0];
}

export function formatSummaryText(
  session: SessionData,
  metrics: ModelSummaryMetrics[],
  insights: string[],
  best: ModelSummaryMetrics | null
): string {
  const lines = [
    "VoxBench Summary Report",
    `Session: ${session.sessionId || "local"}`,
    `Prompts: ${session.prompts.length}`,
    "",
    ...metrics.map((model) =>
      [
        `${model.name}`,
        `  Latency: ${Math.round(model.avgLatency)} ms`,
        `  Text Fidelity: ${model.avgFidelity.toFixed(1)}%`,
        `  Determinism: ${model.avgDeterminism.toFixed(0)}%`,
        `  Failure Rate: ${(model.failureRate * 100).toFixed(1)}%`,
        `  Speed: ${model.controllability.speed}`,
        `  Pronunciation: ${model.controllability.pronunciationNote}`,
      ].join("\n")
    ),
    "",
    "Key Insights",
    ...insights.map((insight) => `- ${insight}`),
    "",
    best
      ? `Recommendation: ${best.name} — best combination of latency, fidelity, reliability, and controllability.`
      : "Recommendation: not enough data yet.",
  ];

  return lines.join("\n");
}
