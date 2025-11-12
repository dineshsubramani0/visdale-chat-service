import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ENV_CONFIG_KEYS } from './utils/constant/env.constant';
import { CustomLogger } from './logger/logger.service';
import helmet from 'helmet';
import { AllExceptionsFilter } from './exception-filters/all-exceptions.filter';
import { BaseInterceptor } from './interceptor/base.interceptor';
import { formatErrorPipe } from './helper/format-errors.helper';
import cookieParser from 'cookie-parser';
import { EncryptionService } from './services/encryption.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Config
  const configService = app.get(ConfigService);
  const application = configService.get<string>(ENV_CONFIG_KEYS.APPLICATION);
  const port = +configService.get<number>(ENV_CONFIG_KEYS.APP_PORT) || 3000;
  const frontendUrl = configService.get<number>(ENV_CONFIG_KEYS.FRONTEND_URL);
  // Security middlewares
  app.use(helmet());
  app.enableCors({
    origin: [frontendUrl],
    credentials: true,
  });
  app.use(cookieParser());

  // Logger
  app.useLogger(app.get(CustomLogger));
  const customLogger = app.get(CustomLogger);
  const customEncryption = app.get(EncryptionService);

  // Global handlers
  app.useGlobalFilters(new AllExceptionsFilter(customEncryption));
  app.useGlobalPipes(formatErrorPipe);
  app.useGlobalInterceptors(
    new BaseInterceptor(__filename, customLogger, customEncryption),
  );

  await app.listen(port);

  customLogger.log(
    {
      message: `${application} is running on port ${port}`,
      filepath: __filename,
      functionname: bootstrap.name,
    },
    bootstrap.name,
  );
}

bootstrap();
