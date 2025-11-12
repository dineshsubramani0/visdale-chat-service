import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class AbstractFieldsValidationPipe<T extends Record<string, unknown>>
  implements PipeTransform<T>
{
  constructor(private readonly abstractFields: string[]) {}

  transform(value: T): T {
    if (typeof value !== 'object' || value === null) {
      throw new BadRequestException('Invalid request body');
    }

    const invalidFields = this.abstractFields.filter((field) => field in value);

    if (invalidFields.length > 0) {
      throw new BadRequestException(
        `Fields ${invalidFields.join(', ')} are not allowed in the request body.`,
      );
    }

    return value;
  }
}
