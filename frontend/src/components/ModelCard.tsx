import { useState } from "react";
import { Info } from "lucide-react";
import type { ModelOption } from "../types";

interface Props {
  model: ModelOption;
  selected: boolean;
  onToggle: (modelId: string) => void;
}

const LOGOS: Record<string, string> = {
  rime: "/logos/rime.png",
  elevenlabs: "/logos/elevenlabs.png",
  deepgram: "/logos/deepgram.jpeg",
};

const MODEL_INFO: Record<
  string,
  { modelName: string; modelDesc: string; voiceName: string; voiceDesc: string; rawText: string }
> = {
  rime: {
    modelName: "mistv2",
    modelDesc: "Lowest latency model",
    voiceName: "astra",
    voiceDesc: "Female, professional, neutral",
    rawText: "mistv2 - Lowest latency model | astra - Female, professional, neutral",
  },
  elevenlabs: {
    modelName: "flash v2.5",
    modelDesc: "Lowest Latency model",
    voiceName: "laura",
    voiceDesc: "Female, Professional, neutral",
    rawText: "flash v2.5 - Lowest Latency model | laura - Female, Professional, neutral",
  },
  deepgram: {
    modelName: "Aura-2",
    modelDesc: "lowest latency model",
    voiceName: "Thalia",
    voiceDesc: "female, professional, neutral",
    rawText: "Aura-2 - lowest latency model | Thalia - female, professional, neutral",
  },
};

function ModelGlyph({ id, name }: { id: string; name: string }) {
  const src = LOGOS[id];
  if (src) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-700 bg-white/5 p-1">
        <img src={src} alt={name} className="h-full w-full rounded-full object-contain" />
      </span>
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 12c2-4 4-6 8-6s6 2 8 6c-2 4-4 6-8 6s-6-2-8-6Z" />
        <path d="M8 12c1-2 2-3 4-3s3 1 4 3c-1 2-2 3-4 3s-3-1-4-3Z" />
      </svg>
    </span>
  );
}

export function ModelCard({ model, selected, onToggle }: Props) {
  const [showInfo, setShowInfo] = useState(false);
  const lockedPrimary = model.isPrimary && selected;
  const info = MODEL_INFO[model.id];

  return (
    <div className="flex items-center justify-between py-4">
      <label className="flex items-center gap-4 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(model.id)}
          disabled={lockedPrimary}
          className="h-5 w-5 accent-primary cursor-pointer disabled:cursor-not-allowed"
        />
        <ModelGlyph id={model.id} name={model.name} />
        <span className="text-lg font-semibold text-white">{model.name}</span>
      </label>

      <div className="flex items-center gap-3">
        {model.isPrimary && (
          <span className="rounded-full border border-primary/70 px-3 py-0.5 text-sm font-medium text-primary">
            Primary
          </span>
        )}
        <div className="relative">
          <button
            type="button"
            title={info ? info.rawText : `${model.name} details`}
            onClick={(e) => {
              e.stopPropagation();
              setShowInfo((prev) => !prev);
            }}
            onMouseEnter={() => setShowInfo(true)}
            onMouseLeave={() => setShowInfo(false)}
            className="rounded-lg p-1 text-gray-400 transition hover:bg-white/5 hover:text-primary"
            aria-label={`${model.name} details`}
          >
            <Info size={18} />
          </button>
          {showInfo && info && (
            <div className="pointer-events-none absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-sky-900/70 bg-[#0c1433] p-3 text-xs shadow-2xl">
              <div className="mb-2 flex items-center justify-between border-b border-gray-800 pb-1.5">
                <span className="font-semibold text-white">{model.name}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Details
                </span>
              </div>
              <div className="space-y-1.5 text-gray-300">
                <div>
                  <span className="font-medium text-gray-400">Model: </span>
                  <span className="font-semibold text-white">{info.modelName}</span>
                  <span className="text-gray-400"> — {info.modelDesc}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-400">Voice: </span>
                  <span className="font-semibold text-white">{info.voiceName}</span>
                  <span className="text-gray-400"> — {info.voiceDesc}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
