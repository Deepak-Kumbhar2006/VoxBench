import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  SlidersHorizontal,
  Sparkles,
  Target,
  TriangleAlert,
  X,
} from "lucide-react";
import type { ModelSummaryMetrics, SessionData } from "../types";
import {
  aggregateSession,
  formatSummaryText,
  generateInsights,
  pickBestOverall,
} from "../utils/summary";

const LOGOS: Record<string, string> = {
  rime: "/logos/rime.png",
  elevenlabs: "/logos/elevenlabs.png",
  deepgram: "/logos/deepgram.jpeg",
};

interface Props {
  session: SessionData;
  onBack: () => void;
}

function StatusIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <Check size={16} className="text-green-400" />
  ) : (
    <X size={16} className="text-red-400" />
  );
}

function latencyBarWidth(value: number, metrics: ModelSummaryMetrics[]) {
  const max = Math.max(...metrics.map((model) => model.avgLatency), 1);
  return `${Math.min((value / max) * 100, 100)}%`;
}

export function SummaryReport({ session, onBack }: Props) {
  const metrics = useMemo(() => aggregateSession(session), [session]);
  const insights = useMemo(() => generateInsights(metrics), [metrics]);
  const best = useMemo(() => pickBestOverall(metrics), [metrics]);
  const [copied, setCopied] = useState(false);

  const summaryText = useMemo(
    () => formatSummaryText(session, metrics, insights, best),
    [session, metrics, insights, best]
  );

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed", error);
      window.alert("Unable to copy summary.");
    }
  };

  const exportReport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      session,
      metrics,
      insights,
      recommendation: best,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `voxbench-summary-${session.sessionId || "session"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-dark px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 grid grid-cols-3 items-center">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 justify-self-start text-gray-300 transition hover:text-white"
          >
            <ArrowLeft size={18} />
            Back to Benchmark
          </button>
          <h1 className="justify-self-center text-3xl font-bold">
            Vox<span className="text-primary">Bench</span>
          </h1>
          <button
            type="button"
            onClick={exportReport}
            className="inline-flex items-center justify-self-end gap-2 rounded-xl border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-primary hover:text-white"
          >
            <Download size={16} />
            Export
          </button>
        </header>

        <div className="mb-8">
          <h2 className="text-3xl font-bold">Summary Report</h2>
          <p className="mt-2 text-gray-400">
            Overview of model performance across {session.prompts.length} prompt
            {session.prompts.length === 1 ? "" : "s"} in this session.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-[#0b1028]">
          <div
            className="min-w-[720px] grid"
            style={{
              gridTemplateColumns: `220px repeat(${metrics.length}, minmax(180px, 1fr))`,
            }}
          >
            <div className="border-b border-gray-800 p-5" />
            {metrics.map((model) => (
              <div
                key={model.id}
                className="border-b border-l border-gray-800 p-5"
              >
                <div className="flex items-center gap-2">
                  {LOGOS[model.id] ? (
                    <img
                      src={LOGOS[model.id]}
                      alt={model.name}
                      className="h-5 w-5 rounded-full object-contain"
                    />
                  ) : (
                    <Activity size={16} className="text-primary" />
                  )}
                  <h3 className="text-lg font-semibold">{model.name}</h3>
                </div>
              </div>
            ))}

            <MetricLabel
              icon={<Clock size={16} />}
              title="Latency (TTFB)"
              description="Average time taken to receive the first byte."
            />
            {metrics.map((model) => (
              <div key={`${model.id}-latency`} className="border-l border-gray-800 p-5">
                <div className="mb-2 text-2xl font-bold">
                  {Math.round(model.avgLatency)} ms
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: latencyBarWidth(model.avgLatency, metrics) }}
                  />
                </div>
              </div>
            ))}

            <MetricLabel
              icon={<Activity size={16} />}
              title="Text Fidelity (Reverse STT)"
              description="How accurately the transcribed text matches the original input."
            />
            {metrics.map((model) => (
              <div
                key={`${model.id}-fidelity`}
                className="border-l border-gray-800 p-5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    {model.avgFidelity.toFixed(0)}%
                  </span>
                  <CheckCircle2 size={18} className="text-primary" />
                </div>
              </div>
            ))}

            <div className="col-span-full border-y border-gray-800 bg-[#0d1433] px-5 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                <SlidersHorizontal size={16} className="text-primary" />
                Controllability
              </div>
              <p className="mt-1 text-xs text-gray-500">
                How many controllability parameters the model satisfies.
              </p>
            </div>
            <div className="px-5 py-3 text-sm text-gray-300">Speed</div>
            {metrics.map((model) => (
              <div
                key={`${model.id}-speed`}
                className="border-l border-gray-800 px-5 py-3 text-sm text-gray-300"
              >
                <div className="flex items-center gap-2">
                  <StatusIcon ok={model.controllability.speedOk} />
                  {model.controllability.speed}
                </div>
              </div>
            ))}
            <div className="px-5 py-3 text-sm text-gray-300">Pronunciation</div>
            {metrics.map((model) => (
              <div
                key={`${model.id}-pron`}
                className="border-l border-gray-800 px-5 py-3 text-sm text-gray-300"
              >
                <div className="flex items-center gap-2">
                  <StatusIcon ok={model.controllability.pronunciation} />
                  {model.controllability.pronunciationNote}
                </div>
              </div>
            ))}

            <div className="col-span-full border-y border-gray-800 bg-[#0d1433] px-5 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                <Target size={16} className="text-primary" />
                Reliability
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Measures consistency and success rate. Determinism uses 5 runs per
                prompt: 100 × (1 − unique transcriptions / 5).
              </p>
            </div>
            <MetricLabel
              icon={<Sparkles size={16} />}
              title="Determinism"
              description="Higher is more consistent across repeated runs."
            />
            {metrics.map((model) => (
              <div
                key={`${model.id}-det`}
                className="border-l border-gray-800 p-5 text-xl font-bold text-blue-400"
              >
                {model.avgDeterminism.toFixed(0)}%
              </div>
            ))}
            <MetricLabel
              icon={<TriangleAlert size={16} />}
              title="Failure Rate"
              description="% of runs where a result was not generated."
            />
            {metrics.map((model) => (
              <div
                key={`${model.id}-fail`}
                className={`border-l border-gray-800 p-5 text-xl font-bold ${
                  model.failureRate === 0 ? "text-green-400" : "text-amber-400"
                }`}
              >
                {(model.failureRate * 100).toFixed(1)}%
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <section className="rounded-2xl border border-gray-800 bg-[#0b1028] p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              <h3 className="text-lg font-semibold">Key Insights</h3>
            </div>
            <ul className="space-y-3 text-sm leading-relaxed text-gray-300">
              {insights.map((insight) => (
                <li key={insight} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {insight}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => void copySummary()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white transition hover:bg-blue-600"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? "Copied" : "Copy Summary"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricLabel({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="border-t border-gray-800 p-5">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-200">
        <span className="text-gray-400">{icon}</span>
        {title}
      </div>
      <p className="text-xs leading-relaxed text-gray-500">{description}</p>
    </div>
  );
}
