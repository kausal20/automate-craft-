type LogLevel = "debug" | "info" | "warn" | "error";

const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getConfiguredLevel(): LogLevel {
  const envLevel = (process.env.LOG_LEVEL || "").toLowerCase();

  if (envLevel in levelPriority) {
    return envLevel as LogLevel;
  }

  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel): boolean {
  return levelPriority[level] >= levelPriority[getConfiguredLevel()];
}

function formatArgs(tag: string, args: unknown[]): unknown[] {
  return [`[${tag}]`, ...args];
}

function createTaggedLogger(tag: string) {
  return {
    debug(...args: unknown[]) {
      if (shouldLog("debug")) {
        console.debug(...formatArgs(tag, args));
      }
    },
    info(...args: unknown[]) {
      if (shouldLog("info")) {
        console.info(...formatArgs(tag, args));
      }
    },
    warn(...args: unknown[]) {
      if (shouldLog("warn")) {
        console.warn(...formatArgs(tag, args));
      }
    },
    error(...args: unknown[]) {
      if (shouldLog("error")) {
        console.error(...formatArgs(tag, args));
      }
    },
  };
}

export type TaggedLogger = ReturnType<typeof createTaggedLogger>;

export function createLogger(tag: string): TaggedLogger {
  return createTaggedLogger(tag);
}
