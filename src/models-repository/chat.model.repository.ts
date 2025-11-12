import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from 'src/database/database.service';
import { Chat } from 'src/models/chat.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ChatRepository extends BaseService<Chat> {
  constructor(@InjectRepository(Chat) chatModel: Repository<Chat>) {
    super(chatModel);
  }
}
