import { Expose, Type } from 'class-transformer';
import { ParticipantResponseDto } from './participant-response.dto';
import { UserResponseDto } from './user-response.dto';

export class ChatResponseDto {
  @Expose()
  id: string;

  @Expose()
  isGroup: boolean;

  @Expose()
  groupName?: string;

  @Type(() => UserResponseDto)
  @Expose()
  createdBy: UserResponseDto;

  @Type(() => ParticipantResponseDto)
  @Expose()
  participants: ParticipantResponseDto[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
