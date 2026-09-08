import "./config/env";
import express, { Express } from "express";
import cors from "cors";
import benchmarkRoutes from "./routes/benchmark";
import fidelityRoutes from "./routes/fidelity";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./utils/logger";
import { providers } from "./config/providers";

const app: Express = express();
const PORT = Number(process.env.SERVER_PORT) || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/benchmark", benchmarkRoutes);
app.use("/api/fidelity", fidelityRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`VoxBench backend running on http://localhost:${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info("ElevenLabs config", {
    voiceId: providers.elevenlabs.voiceId,
    apiKeyLoaded: Boolean(providers.elevenlabs.apiKey),
  });
});
