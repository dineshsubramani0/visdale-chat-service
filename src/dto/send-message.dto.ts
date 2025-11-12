import { IsString, IsOptional } from 'class-validator';

export class SendMessageDto {
  @IsString({ message: 'chatId must be a string' })
  chatId: string;

  @IsOptional()
  @IsString({ message: 'content must be a string' })
  content?: string;

  @IsOptional()
  @IsString({ message: 'image must be a string' })
  image?: string;

  @IsOptional()
  @IsString({ message: 'replyToId must be a string' })
  replyToId?: string;
}
