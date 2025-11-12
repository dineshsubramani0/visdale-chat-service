import { Injectable } from '@nestjs/common';
import { LOGGER_CONFIG } from 'src/utils/constant/logger.constant';
import { LoggerMessageType } from 'src/@types/types/logger.type';
import { WinstonLoggerLevel } from 'src/@types/enums/logger.enum';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

/**
 * Winston logger wrapper with typed log levels and file rotation
 */
@Injectable()
export class CustomLogger {
  private readonly logger: winston.Logger;

  constructor() {
    const formatMessage = winston.format.printf(
      (info: winston.Logform.TransformableInfo) => {
        const timestamp =
          typeof info.timestamp === 'string'
            ? info.timestamp
            : new Date().toISOString();

        const level =
          typeof info.level === 'string' ? info.level.toUpperCase() : 'INFO';

        const rawMessage =
          typeof info.message === 'string'
            ? info.message
            : JSON.stringify(info.message, null, 2);

        return `[${timestamp}] - ${level} - ${rawMessage.replaceAll('\n', '\n\t\t\t')}`;
      },
    );

    this.logger = winston.createLogger({
      level: LOGGER_CONFIG.LEVEL,
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: LOGGER_CONFIG.DATE.TIMESTAMP }),
            formatMessage,
          ),
        }),
        new DailyRotateFile({
          level: LOGGER_CONFIG.LEVEL,
          filename: LOGGER_CONFIG.LOG_OUTDIR_FILE_NAME,
          datePattern: LOGGER_CONFIG.DATE.DATEPATTERN,
          maxSize: LOGGER_CONFIG.MAXSIZE,
          maxFiles: LOGGER_CONFIG.MAXFILES,
          format: winston.format.combine(
            winston.format.timestamp({ format: LOGGER_CONFIG.DATE.TIMESTAMP }),
            formatMessage,
          ),
        }),
      ],
    });
  }

  /**
   * Generic log dispatcher
   */
  private readonly logByLevel = ({
    level,
    message,
    context,
    stack,
  }: {
    level: WinstonLoggerLevel;
    message: LoggerMessageType;
    context: string;
    stack?: string;
  }): void => {
    let logMessage = '';

    if (typeof message === 'string') {
      logMessage = `[${context}] - ${message}`;
    } else {
      logMessage = `[${context}] - ${message.functionname} - ${message.message} ${
        stack ?? ''
      } in ${
        message?.filepath?.replace(/dist/, 'src').replace(/\.js$/, '.ts') ?? ''
      }`;
    }

    const loggerFn = (
      this.logger as unknown as Record<string, (msg: string) => void>
    )[level.toLowerCase()]; // ✅ ensures correct method name (info, error, etc.)

    if (typeof loggerFn === 'function') {
      loggerFn(logMessage);
    }
  };

  /**
   * Log levels — fully typed
   */
  error(message: LoggerMessageType, stack: string, context: string): void {
    this.logByLevel({
      level: WinstonLoggerLevel.ERROR,
      message,
      stack,
      context,
    });
  }

  warn(message: LoggerMessageType, context: string): void {
    this.logByLevel({
      level: WinstonLoggerLevel.WARN,
      message,
      context,
    });
  }

  log(message: LoggerMessageType, context: string): void {
    this.logByLevel({
      level: WinstonLoggerLevel.INFO,
      message,
      context,
    });
  }

  http(message: LoggerMessageType, context: string): void {
    this.logByLevel({
      level: WinstonLoggerLevel.HTTP,
      message,
      context,
    });
  }

  verbose(message: LoggerMessageType, context: string): void {
    this.logByLevel({
      level: WinstonLoggerLevel.VERBOSE,
      message,
      context,
    });
  }

  debug(message: LoggerMessageType, context: string): void {
    this.logByLevel({
      level: WinstonLoggerLevel.DEBUG,
      message,
      context,
    });
  }
}
