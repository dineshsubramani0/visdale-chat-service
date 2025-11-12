import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validate } from '../dto/env.dto';

@Module({
  imports: [
    NestConfigModule.forRoot({
      validate,
    }),
  ],
})
export class ConfigModule {}
