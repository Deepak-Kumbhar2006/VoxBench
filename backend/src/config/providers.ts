import { envVar } from "./env";

export const providers = {
  rime: {
    name: "Rime",
    model: "mistv2",
    format: "mp3",
    voiceId: "astra",
    get apiKey() {
      return envVar("RIME_API_KEY");
    },
    endpoint: "https://users.rime.ai/v1/rime-tts",
  },
  elevenlabs: {
    name: "ElevenLabs",
    model: "eleven_flash_v2_5",
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0,
    // Jessica (premade). Library voices return 402 on the free API plan.
    voiceId: "FGY2WhTYpPnrIDTdsKH5",
    get apiKey() {
      return envVar("ELEVENLABS_API_KEY");
    },
    endpoint: "https://api.elevenlabs.io/v1/text-to-speech",
  },
  deepgram: {
    name: "Deepgram Aura-2",
    model: "aura-2",
    speed: 1.0,
    voiceId: "thalia",
    get apiKey() {
      return envVar("DEEPGRAM_API_KEY");
    },
    endpoint: "https://api.deepgram.com/v1/speak",
  },
} as const;

export const whisperConfig = {
  get model() {
    return envVar("WHISPER_MODEL") || "tiny";
  },
  language: "en",
  taskTimeout: 30000,
};
