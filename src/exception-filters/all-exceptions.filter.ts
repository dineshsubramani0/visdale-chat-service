import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { EncryptionService } from 'src/services/encryption.service';

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly encryptionService: EncryptionService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorBody: Record<string, any> = {
      statusCode: 500,
      errors: ['Internal server error'],
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      errorBody =
        typeof res === 'string'
          ? { statusCode: status, errors: [res] }
          : (res as Record<string, any>);
    }

    const fullError = {
      ...errorBody,
      path: request.url,
      method: request.method,
      time_stamp: new Date(),
    };

    // Encrypt the entire error object
    const encryptedError = this.encryptionService.encrypt(fullError);

    response.status(status).json(encryptedError);
  }
}
