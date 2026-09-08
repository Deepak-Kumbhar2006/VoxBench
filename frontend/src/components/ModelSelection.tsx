import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, FileText, Shield } from "lucide-react";
import { ModelCard } from "./ModelCard";
import type { ModelOption } from "../types";

interface Props {
  onContinue: (selectedModels: string[]) => void;
}

const MODELS: ModelOption[] = [
  { id: "rime", name: "Rime", isPrimary: true },
  { id: "elevenlabs", name: "ElevenLabs", isPrimary: false },
  { id: "deepgram", name: "Deepgram Aura-2", isPrimary: false },
];

export function ModelSelection({ onContinue }: Props) {
  const [selectedModels, setSelectedModels] = useState<string[]>(["rime"]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsExpanded, setTermsExpanded] = useState(false);

  const toggleModel = (modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId]
    );
  };

  const isValid = selectedModels.length >= 2 && termsAccepted;
  const selectionHint = useMemo(() => {
    if (selectedModels.length < 2) return "Select at least one more model.";
    if (!termsAccepted) return "Accept the benchmark terms to continue.";
    return "";
  }, [selectedModels.length, termsAccepted]);

  const handleContinue = () => {
    if (isValid) onContinue(selectedModels);
  };

  return (
    <div className="min-h-screen bg-dark px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-primary shadow-[0_0_24px_rgba(0,102,255,0.35)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M6 11a6 6 0 0 0 12 0" />
              <path d="M12 17v4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Vox<span className="text-primary">Bench</span>
          </h1>
        </header>

        <h2 className="mb-4 text-4xl font-extrabold leading-tight sm:text-5xl">
          Never blindly pick a{" "}
          <span className="bg-gradient-to-r from-violet-400 to-primary bg-clip-text text-transparent">
            model.
          </span>
        </h2>
        <p className="mb-10 max-w-2xl text-base leading-relaxed text-gray-400 sm:text-lg">
          VoxBench lets you compare TTS models side by side using your own pharmacy IVR use case.
          Expose failures, quantify performance, and observe what users actually hear.
        </p>

        <section className="mb-5 rounded-2xl border border-primary/40 bg-[#0c1233] p-6 sm:p-8">
          <div className="mb-4 flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 12c2-4 4-6 8-6s6 2 8 6c-2 4-4 6-8 6s-6-2-8-6Z" />
              </svg>
            </span>
            <div>
              <h3 className="text-sm font-bold tracking-wider text-white">
                SELECT MODELS TO COMPARE
              </h3>
              <p className="text-sm text-gray-400">
                Choose at least two models to run the benchmark.
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-800">
            {MODELS.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                selected={selectedModels.includes(model.id)}
                onToggle={toggleModel}
              />
            ))}
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-violet-500/50 bg-[#0c1233] p-5 sm:p-6">
          <button
            type="button"
            onClick={() => setTermsExpanded((open) => !open)}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <FileText className="text-violet-400" size={20} />
              <h3 className="text-base font-semibold text-white">
                Benchmark Terms & Conditions
              </h3>
            </div>
            <ChevronDown
              size={20}
              className={`text-gray-400 transition ${termsExpanded ? "rotate-180" : ""}`}
            />
          </button>

          {termsExpanded && (
            <div className="mt-4 space-y-3.5 border-t border-gray-800 pt-4 text-sm leading-relaxed text-gray-300">
              <p className="font-medium text-gray-200">
                By using VoxBench, you acknowledge and agree to the following:
              </p>
              <div className="space-y-3 pl-1 text-gray-400">
                <div>
                  <h4 className="font-semibold text-white">1. Model comparison</h4>
                  <p className="mt-0.5 text-gray-400">
                    Selected TTS models will receive the same benchmark inputs wherever applicable. Results are intended for comparison within the configured benchmark and should not be treated as a universal ranking of speech models.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-white">2. Measurements</h4>
                  <p className="mt-0.5 text-gray-400">
                    VoxBench may measure metrics such as TTFA (Time to First Audio), WER (Word Error Rate), and other quality/reliability indicators. Results can vary depending on model configuration, network conditions, hardware, and API availability.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-white">3. Audio &amp; transcription</h4>
                  <p className="mt-0.5 text-gray-400">
                    Generated audio may be processed through an STT system such as Whisper for transcription and WER evaluation. STT errors can therefore affect measured results.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-white">4. User responsibility</h4>
                  <p className="mt-0.5 text-gray-400">
                    The more various types of corpus/prompt you give to the model. The more accurate benchmarks you will get.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-white">5. Benchmark limitations</h4>
                  <p className="mt-0.5 text-gray-400">
                    Benchmark numbers are accurate for what we tested. But don't assume they'll be the same if you use different text, voices, settings, or scenarios. Your mileage may vary.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-white">6. Reproducibility</h4>
                  <p className="mt-0.5 text-gray-400">
                    VoxBench aims to provide the corpus, configurations, measurements, and generated outputs needed to reproduce and inspect benchmark results where technically and legally possible.
                  </p>
                </div>
              </div>
            </div>
          )}

          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span className="text-sm text-gray-300">
              I have read and understood the VoxBench Benchmark Terms &amp; Conditions.
            </span>
          </label>
        </section>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!isValid}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 text-lg font-bold transition ${isValid
            ? "bg-primary text-white hover:bg-blue-600"
            : "cursor-not-allowed bg-gray-800 text-gray-500"
            }`}
        >
          Continue <ArrowRight size={20} />
        </button>
        {selectionHint && (
          <p className="mt-3 text-center text-sm text-gray-500">{selectionHint}</p>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
          <Shield size={16} />
          <p>Your data and selections are stored locally and securely.</p>
        </div>
      </div>
    </div>
  );
}
