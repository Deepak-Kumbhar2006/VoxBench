import axios, { AxiosRequestConfig } from "axios";
import { providers } from "../config/providers";
import { TTSResult } from "../types";
import { errorMessage, logger } from "../utils/logger";

function measureTtfbConfig(
  startTime: number,
  ttfb: { value: number }
): Pick<AxiosRequestConfig, "onDownloadProgress"> {
  return {
    onDownloadProgress: (event) => {
      if (ttfb.value === 0 && event.loaded > 0) {
        ttfb.value = Date.now() - startTime;
      }
    },
  };
}

function finalizeTtfb(startTime: number, ttfb: { value: number }): number {
  return ttfb.value > 0 ? ttfb.value : Date.now() - startTime;
}

function failure(error: unknown): TTSResult {
  return {
    audio: Buffer.alloc(0),
    ttfb: 0,
    duration: 0,
    status: "error",
    error: errorMessage(error),
  };
}

export class TTSService {
  async callRime(text: string): Promise<TTSResult> {
    if (!providers.rime.voiceId) {
      return failure(new Error("Rime voice ID is required"));
    }

    const startTime = Date.now();
    const ttfb = { value: 0 };
    try {
      const response = await axios.post(
        providers.rime.endpoint,
        {
          text,
          modelId: providers.rime.model,
          speaker: providers.rime.voiceId,
          lang: "eng",
          audioFormat: providers.rime.format,
        },
        {
          headers: {
            Authorization: `Bearer ${providers.rime.apiKey}`,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          responseType: "arraybuffer",
          ...measureTtfbConfig(startTime, ttfb),
        }
      );

      return {
        audio: Buffer.from(response.data),
        ttfb: finalizeTtfb(startTime, ttfb),
        duration: 0,
        status: "success",
      };
    } catch (error) {
      return failure(error);
    }
  }

  async callElevenLabs(text: string): Promise<TTSResult> {
    const voiceId = providers.elevenlabs.voiceId;
    const apiKey = providers.elevenlabs.apiKey;
    if (!voiceId) {
      return failure(new Error("ElevenLabs voice ID is required"));
    }
    if (!apiKey) {
      return failure(
        new Error(
          "ELEVENLABS_API_KEY is missing. Set it in backend/.env and restart the server."
        )
      );
    }

    const voiceUrl = `${providers.elevenlabs.endpoint}/${encodeURIComponent(voiceId)}`;
    const startTime = Date.now();
    const ttfb = { value: 0 };
    try {
      logger.info("ElevenLabs TTS request", {
        voiceUrl,
        voiceId,
        model: providers.elevenlabs.model,
        apiKeyLoaded: true,
        apiKeyLength: apiKey.length,
      });
      const response = await axios.post(
        voiceUrl,
        {
          text,
          model_id: providers.elevenlabs.model,
          voice_settings: {
            stability: providers.elevenlabs.stability,
            similarity_boost: providers.elevenlabs.similarity_boost,
            style: providers.elevenlabs.style,
          },
        },
        {
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          responseType: "arraybuffer",
          ...measureTtfbConfig(startTime, ttfb),
        }
      );

      return {
        audio: Buffer.from(response.data),
        ttfb: finalizeTtfb(startTime, ttfb),
        duration: 0,
        status: "success",
      };
    } catch (error) {
      return failure(error);
    }
  }

  async callDeepgram(text: string): Promise<TTSResult> {
    if (!providers.deepgram.voiceId) {
      return failure(new Error("Deepgram voice ID is required"));
    }

    const model = `${providers.deepgram.model}-${providers.deepgram.voiceId}-en`;
    const startTime = Date.now();
    const ttfb = { value: 0 };
    try {
      const response = await axios.post(
        providers.deepgram.endpoint,
        { text },
        {
          headers: {
            Authorization: `Token ${providers.deepgram.apiKey}`,
            "Content-Type": "application/json",
          },
          params: {
            model,
            encoding: "mp3",
          },
          responseType: "arraybuffer",
          ...measureTtfbConfig(startTime, ttfb),
        }
      );

      return {
        audio: Buffer.from(response.data),
        ttfb: finalizeTtfb(startTime, ttfb),
        duration: 0,
        status: "success",
      };
    } catch (error) {
      return failure(error);
    }
  }
}

export const ttsService = new TTSService();
