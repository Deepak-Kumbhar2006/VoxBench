import {
  Activity,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  Play,
  ShieldCheck,
} from "lucide-react";
import { SkeletonLoader } from "./SkeletonLoader";
import type { ModelRunData } from "../types";
import { RELIABILITY_RUNS } from "../types";
import { getAudioUrl } from "../services/api";

interface Props {
  model: string;
  data: ModelRunData;
  sessionId: string;
}

const modelNames: Record<string, string> = {
  rime: "Rime",
  elevenlabs: "ElevenLabs",
  deepgram: "Deepgram",
};

const LOGOS: Record<string, string> = {
  rime: "/logos/rime.png",
  elevenlabs: "/logos/elevenlabs.png",
  deepgram: "/logos/deepgram.jpeg",
};

export function ResultCard({ model, data, sessionId }: Props) {
  const ttfb = data.latestTtfb || data.avgTTFB || 0;
  const accuracyPercent = data.textFidelityAccuracy;
  const isProcessing = data.textFidelityStatus === "processing";
  const isError = data.textFidelityStatus === "error";
  const isReliabilityReady = data.transcriptions.length >= RELIABILITY_RUNS;
  const hasFidelityResult = data.textFidelityStatus !== "processing";
  const highReliability = data.determinism >= 80;
  const failurePercent = data.failureRate * 100;

  const listen = () => {
    if (!data.latestAudioUrl) return;
    const audio = new Audio(getAudioUrl(data.latestAudioUrl));
    void audio.play();
  };

  return (
    <div
      data-session={sessionId}
      data-run={data.latestRunId}
      className="rounded-xl border border-gray-700 bg-[#0d1230] p-6 transition hover:border-primary/60"
    >
      <div className="mb-6 flex items-center gap-3">
        {LOGOS[model] ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-700 bg-white/5 p-1">
            <img
              src={LOGOS[model]}
              alt={modelNames[model] ?? model}
              className="h-full w-full rounded-full object-contain"
            />
          </span>
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Activity size={18} />
          </span>
        )}
        <h3 className="text-xl font-semibold text-white">
          {modelNames[model] ?? model}
        </h3>
      </div>

      <div className="mb-6 border-b border-gray-800 pb-6">
        <div className="mb-3 flex items-center gap-2">
          <Clock size={14} className="text-gray-400" />
          <span className="text-xs font-semibold tracking-wide text-gray-400">
            LATENCY (TTFB)
          </span>
          <button
            type="button"
            title="Time to first byte for the latest run"
            className="text-gray-500 hover:text-gray-300"
          >
            <Info size={13} />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-white">{Math.round(ttfb)} ms</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min((ttfb / 500) * 100, 100)}%` }}
            />
          </div>
        </div>
        {data.ttfbValues.length > 1 && (
          <p className="mt-2 text-xs text-gray-500">
            Avg across {data.ttfbValues.length} runs: {Math.round(data.avgTTFB)} ms
          </p>
        )}
      </div>

      <div className="mb-6 border-b border-gray-800 pb-6">
        <div className="mb-3 flex items-center gap-2">
          <Activity size={14} className="text-gray-400" />
          <span className="text-xs font-semibold tracking-wide text-gray-400">
            TEXT FIDELITY (REVERSE STT)
          </span>
          <button
            type="button"
            title="How closely reverse-STT matches the original prompt"
            className="text-gray-500 hover:text-gray-300"
          >
            <Info size={13} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {isProcessing ? (
            <SkeletonLoader />
          ) : isError ? (
            <span className="text-sm text-red-400">
              {data.latestError || "Fidelity failed"}
            </span>
          ) : (
            <>
              <span className="text-2xl font-bold text-white">
                {accuracyPercent !== null
                  ? `${Math.round(accuracyPercent)}%`
                  : "N/A"}
              </span>
              {accuracyPercent !== null && (
                <CheckCircle2 size={20} className="text-primary" />
              )}
            </>
          )}
        </div>
      </div>

      {data.ttfbValues.length > 0 && hasFidelityResult && (
        <div className="mb-6 border-b border-gray-800 pb-6">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck size={14} className="text-gray-400" />
            <span className="text-xs font-semibold tracking-wide text-gray-400">
              RELIABILITY
            </span>
            <button
              type="button"
              title="Determinism = 100 × (1 − unique transcriptions / 5). Needs 5 runs."
              className="text-gray-500 hover:text-gray-300"
            >
              <Info size={13} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-1 text-xs text-gray-500">
                Determinism ({Math.min(data.transcriptions.length, RELIABILITY_RUNS)}/
                {RELIABILITY_RUNS})
              </p>
              {isReliabilityReady ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-blue-400">
                      {data.determinism.toFixed(0)}%
                    </span>
                    {highReliability && (
                      <CheckCircle2 size={18} className="text-green-400" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {data.uniqueTranscriptions.length} unique voices
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 size={16} className="animate-spin text-primary" />
                  Waiting for {RELIABILITY_RUNS} runs
                </div>
              )}
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500">Failure Rate</p>
              <span
                className={`text-lg font-bold ${
                  failurePercent === 0 ? "text-green-400" : "text-amber-400"
                }`}
              >
                {failurePercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 text-xs font-semibold tracking-wide text-gray-400">
            TRANSCRIBED TEXT
          </div>
          <p className="line-clamp-3 text-sm text-gray-300">
            {data.textFidelityTranscription || "Awaiting transcription..."}
          </p>
        </div>
        <button
          type="button"
          disabled={!data.latestAudioUrl}
          className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-primary transition hover:text-blue-400"
          onClick={listen}
        >
          <Play size={16} fill="currentColor" />
          Listen
        </button>
      </div>
    </div>
  );
}
