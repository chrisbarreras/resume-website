import * as logger from "firebase-functions/logger";

export class Logger {
  constructor(private className: string) {}
  disableLogging: boolean = false;

  info(methodName: string, message: string, data?: any): void {
    if (this.disableLogging) return;
    logger.info(`[${this.className}.${methodName}] ${message}`, {
      className: this.className,
      methodName,
      ...data
    });
  }

  debug(methodName: string, message: string, data?: any): void {
    if (this.disableLogging) return;
    logger.debug(`[${this.className}.${methodName}] ${message}`, {
      className: this.className,
      methodName,
      ...data
    });
  }

  warn(methodName: string, message: string, data?: any): void {
    if (this.disableLogging) return;
    logger.warn(`[${this.className}.${methodName}] ${message}`, {
      className: this.className,
      methodName,
      ...data
    });
  }

  error(methodName: string, message: string, data?: any): void {
    if (this.disableLogging) return;
    logger.error(`[${this.className}.${methodName}] ${message}`, {
      className: this.className,
      methodName,
      ...data
    });
  }

  note(methodName: string, message: string, data?: any): void {
    logger.info(`[${this.className}.${methodName}] ${message}`, {
      className: this.className,
      methodName,
      ...data
    });
  }

  static create(className: string): Logger {
    return new Logger(className);
  }
}
