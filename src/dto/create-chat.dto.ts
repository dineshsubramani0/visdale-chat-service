import {
  IsString,
  IsOptional,
  IsBoolean,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  Length,
  ValidateIf,
} from 'class-validator';

export class CreateChatDto {
  @ValidateIf((o: CreateChatDto) => !o.isGroup)
  @IsString({ message: 'participantId must be a string' })
  participantId?: string;

  @IsOptional()
  @IsBoolean()
  isGroup?: boolean;

  @ValidateIf((o: CreateChatDto) => o.isGroup)
  @IsArray({ message: 'participants must be an array' })
  @ArrayNotEmpty({ message: 'participants cannot be empty for a group chat' })
  @ArrayUnique({ message: 'participants must be unique' })
  participants?: string[];

  @ValidateIf((o: CreateChatDto) => o.isGroup)
  @IsString({ message: 'groupName must be a string' })
  @Length(3, 50, { message: 'groupName must be between 3 and 50 characters' })
  groupName?: string;
}
