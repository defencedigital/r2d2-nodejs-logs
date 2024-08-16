import { inspect } from 'util';

enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

type LogMessage = {
  timestamp: string;
  level: string;
  message: string;
  microservice: string;
  caller: string;
  [key: string]: unknown;
};

type LogMethod = (message: string | Record<string, unknown>) => void;

class Logger {
  private logLevel: LogLevel;
  private microservice: string;

  public error: LogMethod;
  public warn: LogMethod;
  public info: LogMethod;
  public debug: LogMethod;

  constructor(microservice: string) {
    this.microservice = microservice;
    this.logLevel = this.parseLogLevel(process.env.LOG_LEVEL);

    this.error = this.logLevel >= LogLevel.ERROR ? this.createLogMethod(LogLevel.ERROR) : this.noOp;
    this.warn = this.logLevel >= LogLevel.WARN ? this.createLogMethod(LogLevel.WARN) : this.noOp;
    this.info = this.logLevel >= LogLevel.INFO ? this.createLogMethod(LogLevel.INFO) : this.noOp;
    this.debug = this.logLevel >= LogLevel.DEBUG ? this.createLogMethod(LogLevel.DEBUG) : this.noOp;
  }

  private parseLogLevel(logLevel: string | undefined): LogLevel {
    switch (logLevel?.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private getCallerInfo(): string {
    const error = new Error();
    const stack = error.stack?.split('\n');

    for (let i = 4; i < (stack?.length ?? 0); i++) {
      const caller = stack?.[i];
      if (caller) {
        const match = caller.match(/at ([\w.]+)/);
        if (match) {
          const fullName = match[1];
          const parts = fullName.split('.');
          return parts[parts.length - 1];
        }
      }
    }
    return 'unknown';
  }

  private formatMessage(level: string, message: string | Record<string, unknown>): LogMessage {
    const logMessage: LogMessage = {
      timestamp: new Date().toISOString(),
      level,
      message: typeof message === 'string' ? message : JSON.stringify(this.sanitizeObject(message)),
      microservice: this.microservice,
      caller: this.getCallerInfo(),
    };

    if (typeof message !== 'string') {
      Object.assign(logMessage, this.sanitizeObject(message));
    }

    return logMessage;
  }

  private sanitizeObject(obj: unknown): unknown {
    const seen = new WeakSet();
    const sanitizeValue = (value: unknown): unknown => {
      if (typeof value === 'function') {
        return value.toString();
      }
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack
        };
      }
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
        if (Array.isArray(value)) {
          return value.map(sanitizeValue);
        }
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
          result[key] = sanitizeValue(val);
        }
        return result;
      }
      return value;
    };

    return sanitizeValue(obj);
  }

  private createLogMethod(level: LogLevel): LogMethod {
    return (message: string | Record<string, unknown>): void => {
      const logMessage = this.formatMessage(LogLevel[level], message);
      const output = JSON.stringify(logMessage);

      if (level <= LogLevel.ERROR) {
        console.error(output);
      } else {
        console.log(output);
      }
    };
  }

  private noOp(): void {
    // This method does nothing
  }

  public logComplexError(error: Error | Record<string, unknown>): void {
    if (this.logLevel >= LogLevel.ERROR) {
      let errorMessage: string;

      if (error instanceof Error) {
        errorMessage = `${error.name}: ${error.message}\n${error.stack}`;
      } else {
        errorMessage = JSON.stringify(this.sanitizeObject(error));
      }

      errorMessage = errorMessage.replace(/\n/g, ' ');

      this.error({ complexError: errorMessage });
    }
  }
}

export default Logger;
