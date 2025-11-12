import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from 'src/database/database.service';
import { Message } from 'src/models/message.entity';
import { Repository } from 'typeorm';

@Injectable()
export class MessageRepository extends BaseService<Message> {
  constructor(@InjectRepository(Message) messageModel: Repository<Message>) {
    super(messageModel);
  }
}
