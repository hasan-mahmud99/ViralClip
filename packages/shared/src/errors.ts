export class ViralClipError extends Error {
  readonly code: string;
  override readonly cause?: unknown;
  readonly retryable: boolean;

  constructor(code: string, message: string, opts?: { cause?: unknown; retryable?: boolean }) {
    super(message, opts?.cause !== undefined ? { cause: opts.cause } : undefined);
    this.name = "ViralClipError";
    this.code = code;
    this.cause = opts?.cause;
    this.retryable = opts?.retryable ?? false;
  }
}

export class ConfigError extends ViralClipError {
  constructor(message: string) {
    super("CONFIG_ERROR", message);
    this.name = "ConfigError";
  }
}

export class ProviderError extends ViralClipError {
  constructor(code: string, message: string, opts?: { cause?: unknown; retryable?: boolean }) {
    super(code, message, opts);
    this.name = "ProviderError";
  }
}

export class RateLimitError extends ProviderError {
  readonly retryAfterMs?: number;
  constructor(message: string, opts?: { cause?: unknown; retryAfterMs?: number }) {
    super("RATE_LIMITED", message, { cause: opts?.cause, retryable: true });
    this.name = "RateLimitError";
    this.retryAfterMs = opts?.retryAfterMs;
  }
}

export class RightsError extends ViralClipError {
  constructor(message: string) {
    super("RIGHTS_BLOCKED", message);
    this.name = "RightsError";
  }
}

export class NotFoundError extends ViralClipError {
  constructor(message: string) {
    super("NOT_FOUND", message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends ViralClipError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message);
    this.name = "ValidationError";
  }
}
