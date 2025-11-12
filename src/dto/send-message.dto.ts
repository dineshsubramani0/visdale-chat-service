import { IsString, IsOptional } from 'class-validator';

export class SendMessageDto {
  @IsString()
  chatId: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  replyToId?: string;
}
