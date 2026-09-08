import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";
import {
  BenchmarkRequest,
  BenchmarkResult,
  ModelBenchmarkOutcome,
  ReliabilityBenchmarkResult,
  TTSModel,
} from "../types";
import { ttsService } from "./ttsService";
import { sessionService } from "./sessionService";
import { fidelityQueue } from "./fidelityQueue";
import { logger } from "../utils/logger";

const AUDIO_STORAGE = path.join(process.cwd(), "audio_storage");

if (!fs.existsSync(AUDIO_STORAGE)) {
  fs.mkdirSync(AUDIO_STORAGE, { recursive: true });
}

const RELIABILITY_RUNS = 5;
const ADDITIONAL_RELIABILITY_RUNS = RELIABILITY_RUNS - 1;

export class BenchmarkService {
  async runBenchmark(
    request: BenchmarkRequest
  ): Promise<ReliabilityBenchmarkResult> {
    const sessionId = request.sessionId || uuidv4();
    const modelOrder: TTSModel[] = ["rime", "elevenlabs", "deepgram"];
    const selectedModels = modelOrder.filter((item) =>
      request.selectedModels.includes(item)
    );

    const runs = await Promise.all(
      selectedModels.map((model) =>
        this.runOnce(sessionId, { ...request, selectedModels: [model] })
      )
    );

    return {
      sessionId,
      timestamp: new Date().toISOString(),
      runCount: runs.length,
      runs,
    };
  }

  async runReliability(
    request: BenchmarkRequest
  ): Promise<ReliabilityBenchmarkResult> {
    if (!request.sessionId) {
      throw new Error("A sessionId is required for reliability runs.");
    }

    const runs: BenchmarkResult[] = [];
    const modelOrder: TTSModel[] = ["rime", "elevenlabs", "deepgram"];

    for (const model of modelOrder.filter((item) =>
      request.selectedModels.includes(item)
    )) {
      for (let index = 0; index < ADDITIONAL_RELIABILITY_RUNS; index += 1) {
        logger.info(
          `${model} reliability run ${index + 2}/${RELIABILITY_RUNS}`,
          { sessionId: request.sessionId }
        );
        runs.push(
          await this.runOnce(request.sessionId, {
            ...request,
            selectedModels: [model],
          }, true)
        );
      }
    }

    return {
      sessionId: request.sessionId,
      timestamp: new Date().toISOString(),
      runCount: runs.length,
      runs,
    };
  }

  private async runOnce(
    sessionId: string,
    request: BenchmarkRequest,
    waitForFidelity = false
  ): Promise<BenchmarkResult> {
    const runId = uuidv4();
    const timestamp = new Date().toISOString();

    const sessionFolder = path.join(AUDIO_STORAGE, sessionId);
    if (!fs.existsSync(sessionFolder)) {
      fs.mkdirSync(sessionFolder, { recursive: true });
    }

    const model = request.selectedModels[0] as TTSModel;
    const result =
      model === "rime"
        ? await ttsService.callRime(request.text)
        : model === "elevenlabs"
          ? await ttsService.callElevenLabs(request.text)
          : await ttsService.callDeepgram(request.text);

    const benchmarkResult: BenchmarkResult = {
      sessionId,
      runId,
      results: {},
      timestamp,
    };

    if (result.status === "success") {
      const audioPath = path.join(sessionFolder, `${model}_${runId}.mp3`);
      fs.writeFileSync(audioPath, result.audio);

      await sessionService.storeResult(sessionId, runId, {
        model,
        inputText: request.text,
        category: request.category,
        ttfb: result.ttfb,
        audioPath,
        status: "success",
      });

      const successOutcome: ModelBenchmarkOutcome = {
        ttfb: result.ttfb,
        fidelityId: `${runId}_${model}`,
        audioUrl: `/api/benchmark/audio/${sessionId}/${model}/${runId}`,
        status: "success",
        fidelityStatus: "processing",
      };
      benchmarkResult.results[model] = successOutcome;

      const fidelityJob = fidelityQueue.addJob({
        sessionId,
        runId,
        model,
        audioPath,
        originalText: request.text,
      });
      if (waitForFidelity) {
        const fidelity = await fidelityJob;
        benchmarkResult.results[model] = {
          ...successOutcome,
          fidelityStatus: fidelity.status,
          transcribed: fidelity.transcribed,
          accuracy: fidelity.accuracy,
          fidelityError: fidelity.error,
        };
      }

      logger.info(`Stored ${model} audio`, { ttfb: result.ttfb, audioPath });
    } else {
      await sessionService.storeResult(sessionId, runId, {
        model,
        inputText: request.text,
        category: request.category,
        ttfb: 0,
        audioPath: "",
        status: "error",
      });

      benchmarkResult.results[model] = {
        ttfb: 0,
        fidelityId: "",
        status: "error",
        error: result.error,
      };

      logger.warn(`${model} TTS failed`, result.error);
    }

    return benchmarkResult;
  }
}

export const benchmarkService = new BenchmarkService();
