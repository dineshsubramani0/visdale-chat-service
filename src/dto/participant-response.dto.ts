import { Expose, Type } from 'class-transformer';
import { UserResponseDto } from './user-response.dto';

export class ParticipantResponseDto {
  @Expose()
  id: string;

  @Type(() => UserResponseDto)
  @Expose()
  user: UserResponseDto;

  @Expose()
  isAdmin: boolean;

  @Expose()
  joinedAt: Date;
}
