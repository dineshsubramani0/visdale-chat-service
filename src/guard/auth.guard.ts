import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CustomLogger } from 'src/logger/logger.service';
import apiService from 'src/services/api.service';
import { TokenPayload } from 'src/@types/interfaces/token-payload.interface';
import { EncryptionService } from 'src/services/encryption.service';
import { Reflector } from '@nestjs/core';
import { CHAT_ROUTES } from 'src/utils/constant/routes/chat.route';

export interface RequestWithUser extends Request {
  currentUser?: TokenPayload;
}

interface AxiosErrorLike {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly logger: CustomLogger,
    private readonly encryptionService: EncryptionService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request: RequestWithUser = context
      .switchToHttp()
      .getRequest<RequestWithUser>();

    return apiService(CHAT_ROUTES.INTERSERVICE_COMMUNICATION.AUTH_MS.BASEURL)
      .get<{ data: string | TokenPayload }>(
        CHAT_ROUTES.INTERSERVICE_COMMUNICATION.AUTH_MS.IS_VALID_USER,
        undefined,
        { Authorization: request.headers.authorization },
      )
      .pipe(
        map((res) => {
          const decrypted = this.encryptionService.decrypt(
            res as unknown as string,
          ) as { data: TokenPayload };

          const currentUser = decrypted.data;

          if (currentUser && currentUser.id && currentUser.email) {
            request.currentUser = currentUser;
            return true;
          }

          return false;
        }),
        catchError((error: unknown) => {
          const errorMsg = this.getErrorMessage(error);
          this.handleAuthError(errorMsg);

          if (errorMsg === 'Forbidden') {
            return throwError(() => new ForbiddenException(errorMsg));
          }
          return throwError(() => new UnauthorizedException(errorMsg));
        }),
      );
  }

  private getErrorMessage(error: unknown): string {
    // Narrow unknown to AxiosErrorLike safely
    const axiosError = error as AxiosErrorLike;
    if (axiosError.response?.data?.message)
      return axiosError.response.data.message;
    if (axiosError.message) return axiosError.message;
    return 'An unexpected error occurred';
  }

  private handleAuthError(errorMsg: string): void {
    this.logger.error(
      {
        message: errorMsg,
        filepath: __filename,
        functionname: this.canActivate.name,
      },
      '',
      AuthGuard.name,
    );
  }
}
