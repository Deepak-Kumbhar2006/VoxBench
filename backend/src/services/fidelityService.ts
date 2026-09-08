import { sessionService } from "./sessionService";
import { FidelityScore } from "../types";

export class FidelityService {
  async getFidelityScore(
    sessionId: string,
    runId: string,
    model: string
  ): Promise<FidelityScore> {
    const score = await sessionService.getFidelity(sessionId, runId, model);

    if (!score) {
      return {
        model,
        status: "processing",
        transcribed: null,
        accuracy: null,
        startedAt: new Date().toISOString(),
        completedAt: null,
      };
    }

    return {
      model,
      status: score.status,
      transcribed: score.transcribedText ?? null,
      accuracy: score.accuracy ?? null,
      editDistance: score.editDistance ?? undefined,
      startedAt: score.startedAt,
      completedAt: score.completedAt ?? null,
      error: score.error ?? undefined,
    };
  }
}

export const fidelityService = new FidelityService();
