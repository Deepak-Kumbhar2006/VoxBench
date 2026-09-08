import { whisperService } from "./whisperService";
import { sessionService } from "./sessionService";
import {
  calculateLevenshtein,
  normalizeTextForFidelity,
} from "../utils/levenshtein";
import { errorMessage, logger } from "../utils/logger";

interface FidelityJob {
  sessionId: string;
  runId: string;
  model: string;
  audioPath: string;
  originalText: string;
}

interface QueuedFidelityJob extends FidelityJob {
  resolve: (result: FidelityJobResult) => void;
}

export interface FidelityJobResult {
  status: "completed" | "error";
  transcribed?: string;
  accuracy?: number;
  editDistance?: number;
  error?: string;
}

export class FidelityQueue {
  private queue: QueuedFidelityJob[] = [];
  private isProcessing = false;

  addJob(job: FidelityJob): Promise<FidelityJobResult> {
    const completion = new Promise<FidelityJobResult>((resolve) => {
      this.queue.push({ ...job, resolve });
    });
    logger.info(`[FidelityQueue] Added job: ${job.model} (${job.runId})`);
    if (!this.isProcessing) {
      void this.processQueue();
    }
    return completion;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift()!;

      try {
        logger.info(`[FidelityQueue] Processing: ${job.model} (${job.runId})`);

        const transcriptionResult = await whisperService.transcribeAudio(
          job.audioPath
        );
        const transcribed = transcriptionResult.text;

        const normalizedOriginalText = normalizeTextForFidelity(
          job.originalText
        );
        const normalizedTranscribed = normalizeTextForFidelity(transcribed);
        const editDistance = calculateLevenshtein(
          normalizedOriginalText,
          normalizedTranscribed
        );
        const denom = Math.max(normalizedOriginalText.length, 1);
        const accuracy = Math.max(
          0,
          Math.min(100, 100 * (1 - editDistance / denom))
        );

        await sessionService.storeFidelity(job.sessionId, job.runId, job.model, {
          transcribed,
          accuracy,
          editDistance,
          status: "completed",
        });

        logger.info(
          `[FidelityQueue] Completed: ${job.model} (accuracy: ${accuracy.toFixed(2)}%)`
        );
        job.resolve({
          status: "completed",
          transcribed,
          accuracy,
          editDistance,
        });
      } catch (error) {
        logger.error(`[FidelityQueue] Failed: ${job.model}`, errorMessage(error));

        await sessionService.storeFidelity(job.sessionId, job.runId, job.model, {
          status: "error",
          error: errorMessage(error),
        });
        job.resolve({ status: "error", error: errorMessage(error) });
      }
    }

    this.isProcessing = false;
  }
}

export const fidelityQueue = new FidelityQueue();
