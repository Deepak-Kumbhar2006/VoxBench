import { Router, Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { benchmarkService } from "../services/benchmarkService";
import { BenchmarkRequest } from "../types";
import { errorMessage, logger } from "../utils/logger";

const router = Router();
const AUDIO_STORAGE = path.join(process.cwd(), "audio_storage");

router.post("/run", async (req: Request, res: Response) => {
  try {
    req.setTimeout(10 * 60 * 1000);
    res.setTimeout(10 * 60 * 1000);
    const request = req.body as BenchmarkRequest;

    if (
      !request.text ||
      !request.selectedModels ||
      request.selectedModels.length < 2
    ) {
      return res.status(400).json({
        error: "Invalid request. Provide text and at least 2 selectedModels.",
      });
    }

    const result = await benchmarkService.runBenchmark(request);
    res.json(result);
  } catch (error) {
    logger.error("Benchmark error", error);
    res.status(500).json({ error: errorMessage(error) });
  }
});

router.post("/reliability", async (req: Request, res: Response) => {
  try {
    req.setTimeout(10 * 60 * 1000);
    res.setTimeout(10 * 60 * 1000);
    const request = req.body as BenchmarkRequest;

    if (
      !request.sessionId ||
      !request.text ||
      !request.selectedModels ||
      request.selectedModels.length < 2
    ) {
      return res.status(400).json({
        error: "Invalid request. Provide sessionId, text, and selectedModels.",
      });
    }

    const result = await benchmarkService.runReliability(request);
    res.json(result);
  } catch (error) {
    logger.error("Reliability benchmark error", error);
    res.status(500).json({ error: errorMessage(error) });
  }
});

router.get("/audio/:sessionId/:model/:runId", (req: Request, res: Response) => {
  const sessionId = String(req.params.sessionId);
  const model = String(req.params.model);
  const runId = String(req.params.runId);
  if (![sessionId, model, runId].every((value) => /^[a-zA-Z0-9_-]+$/.test(value))) {
    return res.status(400).json({ error: "Invalid audio path" });
  }

  const audioPath = path.join(AUDIO_STORAGE, sessionId, `${model}_${runId}.mp3`);
  if (!fs.existsSync(audioPath)) {
    return res.status(404).json({ error: "Audio not found" });
  }

  return res.sendFile(audioPath);
});

export default router;
