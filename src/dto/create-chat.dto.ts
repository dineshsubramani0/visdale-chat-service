import {
  IsString,
  IsOptional,
  IsBoolean,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  Length,
} from 'class-validator';

export class CreateChatDto {
  @IsOptional()
  @IsString()
  participantId?: string; // for 1-on-1 chat

  @IsOptional()
  @IsBoolean()
  isGroup?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  participants?: string[]; // userIds

  @IsOptional()
  @IsString()
  @Length(3, 50)
  groupName?: string;
}
