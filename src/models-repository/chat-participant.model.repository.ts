import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from 'src/database/database.service';
import { ChatParticipant } from 'src/models/chat-participant.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ChatParticipantRepository extends BaseService<ChatParticipant> {
  constructor(
    @InjectRepository(ChatParticipant)
    chatParticipantModel: Repository<ChatParticipant>,
  ) {
    super(chatParticipantModel);
  }
}
