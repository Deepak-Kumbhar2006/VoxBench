type LogLevel = "info" | "warn" | "error" | "debug";

function stamp(): string {
  return new Date().toISOString();
}

function write(level: LogLevel, message: string, extra?: unknown): void {
  const prefix = `[${stamp()}] [${level.toUpperCase()}]`;
  if (extra !== undefined) {
    console.log(prefix, message, extra);
  } else {
    console.log(prefix, message);
  }
}

export const logger = {
  info: (message: string, extra?: unknown) => write("info", message, extra),
  warn: (message: string, extra?: unknown) => write("warn", message, extra),
  error: (message: string, extra?: unknown) => write("error", message, extra),
  debug: (message: string, extra?: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      write("debug", message, extra);
    }
  },
};

function decodeResponseBody(data: unknown): string | undefined {
  if (data == null) return undefined;

  let text: string | undefined;
  if (Buffer.isBuffer(data)) {
    text = data.toString("utf8");
  } else if (data instanceof ArrayBuffer) {
    text = Buffer.from(data).toString("utf8");
  } else if (typeof data === "string") {
    text = data;
  } else if (typeof data === "object") {
    return formatProviderDetail(data);
  }

  if (!text) return undefined;
  try {
    return formatProviderDetail(JSON.parse(text));
  } catch {
    return text.slice(0, 500);
  }
}

function formatProviderDetail(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const { status, code, message } = detail as {
      status?: unknown;
      code?: unknown;
      message?: unknown;
    };
    const parts = [status, code, message]
      .filter((part) => typeof part === "string" && part.trim())
      .filter((part, index, list) => list.indexOf(part) === index);
    if (parts.length) return parts.join(": ");
  }
  try {
    return JSON.stringify(payload).slice(0, 500);
  } catch {
    return undefined;
  }
}

export function errorMessage(error: unknown): string {
  if (isAxiosLike(error)) {
    const status = error.response?.status;
    const body = decodeResponseBody(error.response?.data);
    if (status && body) return `HTTP ${status}: ${body}`;
    if (status) return `HTTP ${status}: ${error.message}`;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

function isAxiosLike(
  error: unknown
): error is Error & { response?: { status?: number; data?: unknown } } {
  return Boolean(
    error &&
      typeof error === "object" &&
      "isAxiosError" in error &&
      (error as { isAxiosError?: boolean }).isAxiosError
  );
}
