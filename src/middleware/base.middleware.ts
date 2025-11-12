// src/middleware/base.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CustomLogger } from 'src/logger/logger.service';
import { EncryptionService } from 'src/services/encryption.service';
import { TokenPayload } from 'src/@types/interfaces/token-payload.interface';

declare module 'express' {
  interface Request {
    currentUser?: TokenPayload;
  }
}

@Injectable()
export class BaseMiddleware implements NestMiddleware {
  constructor(
    private readonly logger: CustomLogger,
    private readonly encryptionService: EncryptionService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, url } = req;

    try {
      // Decrypt query and body if needed
      await this.decryptRequest(req);

      // Log incoming request
      this.logRequest(method, url, startTime);

      // Observe the response
      this.observeResponse(res, method, url, startTime);

      // Continue to next middleware/controller
      next();
    } catch (error: unknown) {
      const err =
        error instanceof Error ? error : new Error('Unknown middleware error');
      this.logger.error(
        {
          message: `BaseMiddleware failure: ${err.message}`,
          filepath: __filename,
          functionname: this.use.name,
        },
        err.stack ?? '',
        BaseMiddleware.name,
      );
      next();
    }
  }

  // ------------------- Decryption -------------------
  private async decryptRequest(req: Request): Promise<void> {
    await Promise.all([this.decryptQuery(req), this.decryptBody(req)]);
  }

  private async decryptQuery(req: Request): Promise<void> {
    const data = req.query?.data;
    if (typeof data !== 'string') return;

    const decrypted = await this.safeDecrypt(decodeURIComponent(data));
    if (this.isRecord(decrypted)) {
      for (const [key, value] of Object.entries(decrypted)) {
        (req.query as Record<string, unknown>)[key] = value;
      }
    }

    delete (req.query as Record<string, unknown>).data;
  }

  private async decryptBody(req: Request): Promise<void> {
    const data = (req.body as Record<string, unknown> | undefined)?.data;
    if (typeof data !== 'string') return;

    const decrypted = await this.safeDecrypt(data);
    if (this.isRecord(decrypted)) {
      req.body = {
        ...(req.body as Record<string, unknown>),
        ...decrypted,
      };
    }

    delete (req.body as Record<string, unknown>).data;
  }

  private async safeDecrypt(data: string): Promise<Record<string, unknown>> {
    try {
      const result = await this.encryptionService.decrypt(data);
      return this.isRecord(result) ? result : {};
    } catch (error: unknown) {
      const err =
        error instanceof Error ? error : new Error('Unknown decryption error');
      this.logger.error(
        {
          message: `Decryption failed: ${err.message}`,
          filepath: __filename,
          functionname: this.safeDecrypt.name,
        },
        err.stack ?? '',
        BaseMiddleware.name,
      );
      return {};
    }
  }

  // ------------------- Logging -------------------
  private logRequest(method: string, url: string, startTime: number): void {
    this.logger.http(
      {
        message: `Incoming Request → [${method}] ${url} | Time: ${new Date(startTime).toISOString()}`,
        filepath: __filename,
        functionname: this.logRequest.name,
      },
      BaseMiddleware.name,
    );
  }

  private observeResponse(
    res: Response,
    method: string,
    url: string,
    startTime: number,
  ): void {
    res.on('finish', () => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const logData = {
        message: `Response → [${method}] ${url} | ${res.statusCode} ${res.statusMessage} | ${duration}ms`,
        filepath: __filename,
        functionname: this.observeResponse.name,
      };

      if (res.statusCode >= 400 && res.statusCode < 600) {
        this.logger.error(logData, '', BaseMiddleware.name);
      } else {
        this.logger.http(logData, BaseMiddleware.name);
      }
    });
  }

  // ------------------- Type Guards -------------------
  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
