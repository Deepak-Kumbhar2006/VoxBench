import { Router, Request, Response } from "express";
import { fidelityService } from "../services/fidelityService";
import { errorMessage, logger } from "../utils/logger";

const router = Router();

router.get("/:sessionId/:runId/:model", async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.params.sessionId);
    const runId = String(req.params.runId);
    const model = String(req.params.model);
    const score = await fidelityService.getFidelityScore(
      sessionId,
      runId,
      model
    );
    res.json(score);
  } catch (error) {
    logger.error("Fidelity fetch error", error);
    res.status(500).json({ error: errorMessage(error) });
  }
});

export default router;
