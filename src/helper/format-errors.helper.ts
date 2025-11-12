import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

function formatErrorsHelper(errors: ValidationError[]): string[] {
  const errorMessages: string[] = [];

  function extractFirstErrorMessage(error: ValidationError) {
    if (error.constraints) {
      const firstErrorMessage = Object.values(error.constraints)[0];
      if (firstErrorMessage) {
        errorMessages.push(firstErrorMessage);
      }
    }

    if (error.children && error.children.length > 0) {
      extractFirstErrorMessage(error.children[0]);
    }
  }

  for (const error of errors) {
    extractFirstErrorMessage(error);
  }

  return errorMessages;
}

export const formatErrorPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  exceptionFactory: (errors: ValidationError[]) => {
    throw new BadRequestException(formatErrorsHelper(errors));
  },
});
