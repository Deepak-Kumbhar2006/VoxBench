import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import ffmpegPath from "ffmpeg-static";
import { whisperConfig } from "../config/providers";
import { errorMessage } from "../utils/logger";

const execFileAsync = promisify(execFile);

export class WhisperService {
  private model: string;
  private language: string;

  constructor(model: string = "base", language: string = "en") {
    this.model = model;
    this.language = language;
  }

  async transcribeAudio(audioFilePath: string): Promise<{
    text: string;
    duration: number;
  }> {
    const outputDir = os.tmpdir();
    const baseName = path.parse(audioFilePath).name;
    const jsonPath = path.join(outputDir, `${baseName}.json`);

    try {
      const timeout = Math.max(whisperConfig.taskTimeout, 60000);

      await this.runWhisper(audioFilePath, outputDir, timeout);

      if (!fs.existsSync(jsonPath)) {
        throw new Error(`Whisper JSON output not found at ${jsonPath}`);
      }

      const raw = fs.readFileSync(jsonPath, "utf-8");
      const result = JSON.parse(raw) as { text?: string; duration?: number };

      return {
        text: (result.text || "").trim(),
        duration: result.duration ?? 0,
      };
    } catch (error) {
      throw new Error(`Whisper transcription failed: ${errorMessage(error)}`);
    } finally {
      this.cleanup(jsonPath, baseName, outputDir);
    }
  }

  private async runWhisper(
    audioFilePath: string,
    outputDir: string,
    timeout: number
  ): Promise<void> {
    const args = [
      audioFilePath,
      "--model",
      this.model,
      "--language",
      this.language,
      "--output_format",
      "json",
      "--output_dir",
      outputDir,
    ];

    const ffmpegDirectory = ffmpegPath ? path.dirname(ffmpegPath) : "";
    const environment = {
      ...process.env,
      PATH: [ffmpegDirectory, process.env.PATH].filter(Boolean).join(path.delimiter),
      PYTHONIOENCODING: "utf-8",
      PYTHONUTF8: "1",
    };
    const whisperPython = process.env.WHISPER_PYTHON || "python";
    const commands: [string, string[]][] = [
      ["whisper", args],
      [whisperPython, ["-m", "whisper", ...args]],
    ];
    const failures: string[] = [];

    for (const [command, commandArgs] of commands) {
      try {
        await execFileAsync(command, commandArgs, {
          timeout,
          env: environment,
          windowsHide: true,
        });
        return;
      } catch (error) {
        failures.push(`${command}: ${errorMessage(error)}`);
      }
    }

    throw new Error(`Whisper command failed. ${failures.join(" | ")}`);
  }

  private cleanup(jsonPath: string, baseName: string, outputDir: string): void {
    const extras = [
      jsonPath,
      path.join(outputDir, `${baseName}.txt`),
      path.join(outputDir, `${baseName}.srt`),
      path.join(outputDir, `${baseName}.vtt`),
      path.join(outputDir, `${baseName}.tsv`),
    ];
    for (const file of extras) {
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch {
        // ignore cleanup failures
      }
    }
  }
}

export const whisperService = new WhisperService(
  process.env.WHISPER_MODEL || whisperConfig.model,
  whisperConfig.language
);
