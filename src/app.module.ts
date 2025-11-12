import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BaseMiddleware } from './middleware/base.middleware';
import { LoggerModule } from './logger/logger.module';
import { ConfigModule as NestConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { EncryptionService } from './services/encryption.service';
import { ENV_CONFIG_KEYS } from './utils/constant/env.constant';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    LoggerModule,
    NestConfigModule,
    DatabaseModule,
    ChatModule,
  ],
  controllers: [],
  providers: [
    {
      provide: EncryptionService,
      useFactory: (configService: ConfigService) => {
        const secretKey = configService.get<string>(
          String(ENV_CONFIG_KEYS.ENCRYPTION_SECRET_KEY),
        );
        return new EncryptionService(secretKey);
      },
      inject: [ConfigService],
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BaseMiddleware).forRoutes('*');
  }
}
