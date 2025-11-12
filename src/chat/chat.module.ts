import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthGuard } from 'src/guard/auth.guard';
import { CustomLogger } from 'src/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from 'src/services/encryption.service';
import { ENV_CONFIG_KEYS } from 'src/utils/constant/env.constant';
import { Chat } from 'src/models/chat.entity';
import { ChatRepository } from 'src/models-repository/chat.model.repository';
import { ChatParticipantRepository } from 'src/models-repository/chat-participant.model.repository';
import { MessageRepository } from 'src/models-repository/message.model.repository';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { Message } from 'src/models/message.entity';
import { ChatParticipant } from 'src/models/chat-participant.entity';
import { ChatGateway } from './chat.gateway';
import { JwtService } from '@nestjs/jwt';
import { UsersRepository } from 'src/models-repository/user.model.repository';
import { User } from 'src/models/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Chat, Message, ChatParticipant, User])],
  providers: [
    UsersRepository,
    ChatService,
    ChatRepository,
    ChatParticipantRepository,
    MessageRepository,
    AuthGuard,
    CustomLogger,
    ChatGateway,
    JwtService,
    {
      provide: EncryptionService,
      useFactory: (configService: ConfigService) => {
        const secretKey = configService.get<string>(
          String(ENV_CONFIG_KEYS.ENCRYPTION_SECRET_KEY),
        );
        return new EncryptionService(secretKey);
      },
      inject: [ConfigService],
    },
  ],
  controllers: [ChatController],
})
export class ChatModule {}
