import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Response } from 'express';
import { ResponseData } from 'src/@types/interfaces/responce.interface';
import { CustomLogger } from 'src/logger/logger.service';
import { EncryptionService } from 'src/services/encryption.service';

@Injectable()
export class BaseInterceptor implements NestInterceptor {
  constructor(
    private readonly filename: string,
    private readonly logger: CustomLogger,
    private readonly encryptionService: EncryptionService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request & { method: string; url: string }>();
    const res = ctx.getResponse<Response>();
    const { method, url } = req;
    const now = Date.now();

    // Log incoming request
    this.logger?.http(
      {
        message: `Incoming → Method: ${method} | URL: ${url} | Timestamp: ${new Date(now).toISOString()}`,
        filepath: this.filename,
        functionname: context.getHandler().name,
      },
      context.getClass().name,
    );

    return next.handle().pipe(
      map((response: ResponseData) => {
        const statusCode = res.statusCode ?? HttpStatus.OK;

        // Log outgoing response
        this.logger?.http(
          {
            message: `Outgoing → Status Code: ${statusCode} | Method: ${method} | URL: ${url} | Duration: ${Date.now() - now}ms`,
            filepath: this.filename,
            functionname: context.getHandler().name,
          },
          context.getClass().name,
        );

        return this.formatSuccess(response, statusCode);
      }),
      catchError((error: unknown) => {
        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let errorResponse: string | Record<string, any> =
          'Internal Server Error';

        if (error instanceof HttpException) {
          statusCode = error.getStatus();
          const response = error.getResponse();
          errorResponse =
            typeof response === 'string'
              ? response
              : (response as Record<string, any>);
        }

        if (error instanceof Error) {
          this.logger?.error(
            {
              message: `Error → Status Code: ${statusCode} | Method: ${method} | URL: ${url} | Error: ${error.message} | Duration: ${Date.now() - now}ms`,
              filepath: this.filename,
              functionname: context.getHandler().name,
            },
            error.stack ?? '',
            context.getClass().name,
          );
        }

        return throwError(() => new HttpException(errorResponse, statusCode));
      }),
    );
  }

  private formatSuccess(response: ResponseData, statusCode: number) {
    const rawData = response?.data ?? response ?? null;

    const fullSuccess = {
      status_code: response?.status_code ?? statusCode,
      data: rawData,
      ...(response?.message && { message: response.message }),
      ...(response?.metadata && { metadata: response.metadata }),
      time_stamp: new Date(),
    };
    const encryptedSuccess = this.encryptionService.encrypt(fullSuccess);

    return encryptedSuccess;
  }
}
