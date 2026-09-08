import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  Search,
  Sparkles,
} from "lucide-react";
import { ResultCard } from "./ResultCard";
import { getFidelityScore, runBenchmark, runReliability } from "../services/api";
import {
  applyBenchmarkBatch,
  applyFidelityResult,
  createSession,
  emptyModelRun,
  markPromptIdle,
  saveSession,
  startReadingPrompt,
} from "../utils/session";
import type { BenchmarkCategory, SessionData, TTSModel } from "../types";
import { medicalPrompts } from "../data/medicalPrompts";

interface Props {
  selectedModels: string[];
  initialSession?: SessionData | null;
  onBack: () => void;
  onSummarise: (session: SessionData) => void;
  onSessionChange?: (session: SessionData) => void;
}

const wait = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

async function waitForFidelity(
  sessionId: string,
  runId: string,
  model: string
) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const score = await getFidelityScore(sessionId, runId, model);
    if (score.status !== "processing") return score;
    await wait(250);
  }
  throw new Error(`Timed out waiting for ${model} text fidelity.`);
}

export function LiveBenchmark({
  selectedModels,
  initialSession,
  onBack,
  onSummarise,
  onSessionChange,
}: Props) {
  const [sessionData, setSessionData] = useState<SessionData>(
    () => initialSession ?? createSession(selectedModels)
  );
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(
    () => new Set((initialSession?.prompts ?? []).map((prompt) => prompt.promptId))
  );
  const [inputText, setInputText] = useState("");
  const [category, setCategory] = useState<BenchmarkCategory>("None");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef(sessionData);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionRef.current = sessionData;
    saveSession(sessionData);
    onSessionChange?.(sessionData);
  }, [sessionData, onSessionChange]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleRun = async (prompt = inputText) => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setErrorMessage("");

    const activeCategory =
      category && category !== "None" ? category : "Normal";

    const { session: readingSession, promptId } = startReadingPrompt(
      sessionRef.current,
      prompt,
      activeCategory,
      selectedModels
    );
    sessionRef.current = readingSession;
    setSessionData(readingSession);
    setExpandedPrompts(new Set([promptId]));
    setInputText("");

    window.requestAnimationFrame(() => {
      feedRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });

    try {
      const batch = await runBenchmark(
        prompt,
        selectedModels,
        activeCategory,
        sessionRef.current.sessionId || undefined
      );

      const nextSession = applyBenchmarkBatch(
        sessionRef.current,
        promptId,
        prompt,
        activeCategory,
        selectedModels,
        batch.sessionId,
        batch.runs
      );
      sessionRef.current = nextSession;
      setSessionData(nextSession);

      for (const run of batch.runs) {
        const model = selectedModels.find((item) => Boolean(run.results[item as keyof typeof run.results]));
        const outcome = model
          ? run.results[model as keyof typeof run.results]
          : undefined;
        if (!model || !outcome || outcome.status !== "success") continue;

        const fidelity = await waitForFidelity(
          batch.sessionId,
          run.runId,
          model
        );
        const fidelitySession = applyFidelityResult(
          sessionRef.current,
          promptId,
          model,
          run.runId,
          fidelity
        );
        sessionRef.current = fidelitySession;
        setSessionData(fidelitySession);
      }

      const reliability = await runReliability(
        prompt,
        selectedModels,
        activeCategory,
        batch.sessionId
      );
      const completedSession = applyBenchmarkBatch(
        sessionRef.current,
        promptId,
        prompt,
        activeCategory,
        selectedModels,
        reliability.sessionId,
        reliability.runs
      );
      sessionRef.current = completedSession;
      setSessionData(completedSession);

      window.requestAnimationFrame(() => {
        feedRef.current?.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      });

    } catch (error) {
      console.error("Benchmark error:", error);
      const idle = markPromptIdle(sessionRef.current, promptId);
      sessionRef.current = idle;
      setSessionData(idle);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Error running benchmark. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const togglePrompt = (promptId: string) => {
    setExpandedPrompts((prev) => {
      const next = new Set(prev);
      if (next.has(promptId)) next.delete(promptId);
      else next.add(promptId);
      return next;
    });
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-dark px-4 py-6 text-white sm:px-8">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
        <header className="mb-6 grid shrink-0 grid-cols-3 items-center">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 justify-self-start text-gray-300 transition hover:text-white"
          >
            <ArrowLeft size={18} />
            Pick a Model
          </button>
          <h1 className="justify-self-center text-3xl font-bold">
            Vox<span className="text-primary">Bench</span>
          </h1>
          <span />
        </header>

        <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleRun()}
              placeholder="Choose a prompt or enter the custom prompt..."
              className="w-full rounded-xl border border-primary bg-[#0c1233] py-3 pl-11 pr-4 text-white placeholder-gray-500 outline-none transition focus:border-blue-400"
            />
          </div>

          <div className="relative" ref={suggestionsRef}>
            <button
              type="button"
              onClick={() => setShowSuggestions((open) => !open)}
              className={`flex h-full min-w-[150px] items-center justify-center gap-2 rounded-xl border bg-[#0c1233] px-5 py-3 font-semibold transition ${
                showSuggestions
                  ? "border-sky-500 text-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.2)]"
                  : "border-gray-700 text-sky-400 hover:border-gray-600 hover:bg-gray-900"
              }`}
            >
              <Sparkles size={16} className="text-sky-400" />
              Suggestions {showSuggestions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showSuggestions && (
              <div className="absolute right-0 z-30 mt-2 w-[540px] max-w-[calc(100vw-32px)] rounded-2xl border border-sky-900/60 bg-[#0c1433] p-4 shadow-2xl backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between border-b border-gray-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-sky-400" />
                    <span className="text-xs font-bold tracking-wider text-sky-400 uppercase">
                      PROMPT SUGGESTIONS
                    </span>
                    <span className="rounded-full border border-sky-800/80 bg-sky-950/80 px-2.5 py-0.5 text-[11px] font-semibold text-sky-400">
                      {medicalPrompts.length} Presets
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">Click any prompt to select</span>
                </div>

                <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
                  {medicalPrompts.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInputText(item.prompt);
                        setCategory(item.type);
                        setShowSuggestions(false);
                      }}
                      className="group flex w-full items-start gap-3 rounded-xl border border-sky-950/80 bg-[#0c1433]/70 p-3 text-left transition hover:border-sky-500/50 hover:bg-[#101b44]"
                    >
                      <span className="shrink-0 rounded-lg border border-sky-800/60 bg-sky-950/90 px-2.5 py-1 text-xs font-semibold text-sky-400 min-w-[64px] text-center">
                        {item.type}
                      </span>
                      <p className="flex-1 text-sm leading-relaxed text-gray-300 group-hover:text-white">
                        {item.prompt}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleRun()}
            disabled={!inputText.trim() || loading}
            className="rounded-xl bg-primary px-8 py-3 font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-700"
          >
            {loading ? "Reading..." : "Run"}
          </button>
        </div>

        <p className="mb-4 shrink-0 text-sm text-gray-500">
          Category: <span className="text-gray-300">{category}</span>
          {loading && (
            <span className="ml-3 text-primary">
              Measuring text fidelity, then reliability
            </span>
          )}
        </p>

        {errorMessage && (
          <div className="mb-4 shrink-0 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        <div
          ref={feedRef}
          className="min-h-0 flex-1 overflow-y-auto pr-1"
        >
          {sessionData.prompts.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <p>No results yet. Enter a prompt and click Run to get started.</p>
            </div>
          ) : (
            <div className="space-y-6 pb-6">
              {sessionData.prompts.map((prompt, index) => {
                const isExpanded = expandedPrompts.has(prompt.promptId);
                const isLatest = index === 0;

                return (
                  <div
                    key={prompt.promptId}
                    className="rounded-2xl border border-gray-800 bg-[#0b1028] p-4 sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => togglePrompt(prompt.promptId)}
                        className="flex-1 text-left"
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <p className="text-sm text-gray-400">
                            <strong className="text-gray-200">{prompt.category}</strong>
                          </p>
                          {isLatest && (
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                              Latest
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-200">{prompt.text}</p>
                        <p className="mt-2 text-xs text-gray-500">
                          {new Date(prompt.timestamp).toLocaleTimeString()}
                          {` · ${prompt.runCount || 5} backend runs`}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => togglePrompt(prompt.promptId)}
                        className="inline-flex items-center gap-1 text-sm text-gray-400 transition hover:text-white"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {isExpanded ? "Collapse" : "Expand"}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                        {selectedModels.map((model) => (
                          <ResultCard
                            key={`${prompt.promptId}-${model}`}
                            model={model}
                            data={
                              prompt.models[model as TTSModel] ??
                              emptyModelRun(model)
                            }
                            sessionId={sessionData.sessionId}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {sessionData.prompts.length > 0 && (
          <div className="mt-3 flex shrink-0 justify-end border-t border-gray-800 pt-3">
            <button
              type="button"
              onClick={() => {
                saveSession(sessionData);
                onSummarise(sessionData);
              }}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-700"
            >
              <FileText size={18} />
              Summarise
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
