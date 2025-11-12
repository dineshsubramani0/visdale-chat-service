import { IsArray, IsUUID } from 'class-validator';

export class AddParticipantsDto {
  @IsArray()
  @IsUUID('all', { each: true })
  userIds: string[];
}
