import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../../.env"),
];
const envPath = envCandidates.find((candidate) => fs.existsSync(candidate));

if (envPath) {
  dotenv.config({ path: envPath, override: true });
} else {
  dotenv.config();
}

export function envVar(name: string): string {
  return (process.env[name] || "").trim();
}
