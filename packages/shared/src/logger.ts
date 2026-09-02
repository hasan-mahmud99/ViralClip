export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export class Logger {
  private readonly name: string;
  private readonly level: LogLevel;
  private readonly base: LogContext;

  constructor(name: string, opts?: { level?: LogLevel; base?: LogContext }) {
    this.name = name;
    this.level = opts?.level ?? (process.env.LOG_LEVEL as LogLevel) ?? "info";
    this.base = opts?.base ?? {};
  }

  child(name: string, extra: LogContext = {}): Logger {
    return new Logger(`${this.name}.${name}`, { level: this.level, base: { ...this.base, ...extra } });
  }

  with(extra: LogContext): Logger {
    return new Logger(this.name, { level: this.level, base: { ...this.base, ...extra } });
  }

  debug(msg: string, ctx: LogContext = {}): void {
    this.write("debug", msg, ctx);
  }

  info(msg: string, ctx: LogContext = {}): void {
    this.write("info", msg, ctx);
  }

  warn(msg: string, ctx: LogContext = {}): void {
    this.write("warn", msg, ctx);
  }

  error(msg: string, ctx: LogContext = {}): void {
    this.write("error", msg, ctx);
  }

  private write(level: LogLevel, msg: string, ctx: LogContext): void {
    if (LEVEL_RANK[level] < LEVEL_RANK[this.level]) return;
    const line = {
      ts: new Date().toISOString(),
      level,
      logger: this.name,
      msg,
      ...this.base,
      ...ctx,
    };
    const out = level === "error" ? process.stderr : process.stdout;
    out.write(JSON.stringify(line) + "\n");
  }
}

export function createLogger(name: string, opts?: { level?: LogLevel; base?: LogContext }): Logger {
  return new Logger(name, opts);
}
