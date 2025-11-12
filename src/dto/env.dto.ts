import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsString,
  validateSync,
} from 'class-validator';
import { Environment } from 'src/@types/enums/env.enum';
import { EnvInterface } from 'src/@types/interfaces/env.interface';

class EnvironmentVariablesDto implements EnvInterface {
  @IsEnum([Environment.Development, Environment.Production])
  @IsNotEmpty()
  NODE_ENV: string;

  @IsNumberString()
  @IsNotEmpty()
  APP_PORT: string;

  @IsString()
  @IsNotEmpty()
  APPLICATION: string;

  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsInt()
  @IsNotEmpty()
  DB_PORT: number;

  @IsString()
  @IsNotEmpty()
  DB_USERNAME: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_DATABASE: string;

  @IsString()
  @IsNotEmpty()
  DB_SCHEMA: string;

  @IsBoolean()
  @IsNotEmpty()
  DB_SYNC: boolean;

  @IsBoolean()
  @IsNotEmpty()
  DB_LOG: boolean;

  @IsString()
  @IsNotEmpty()
  ENCRYPTION_SECRET_KEY: string;

  @IsString()
  @IsNotEmpty()
  FRONTEND_URL: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariablesDto, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Config validation error: ${errors
        .map((err) => Object.values(err.constraints || {}).join(', '))
        .join('; ')}`,
    );
  }

  return validatedConfig;
}
