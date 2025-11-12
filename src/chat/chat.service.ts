// src/chat/chat.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ChatRepository } from 'src/models-repository/chat.model.repository';
import { ChatParticipantRepository } from 'src/models-repository/chat-participant.model.repository';
import { MessageRepository } from 'src/models-repository/message.model.repository';
import { User } from 'src/models/user.entity';
import { Chat } from 'src/models/chat.entity';
import { ChatParticipant } from 'src/models/chat-participant.entity';
import { Message } from 'src/models/message.entity';
import { CreateChatDto } from 'src/dto/create-chat.dto';
import { SendMessageDto } from 'src/dto/send-message.dto';
import { JwtService } from '@nestjs/jwt';
import { UsersRepository } from 'src/models-repository/user.model.repository';
import { JwtPayload } from 'jsonwebtoken';

@Injectable()
export class ChatService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly chatRepo: ChatRepository,
    private readonly participantRepo: ChatParticipantRepository,
    private readonly userRepo: UsersRepository,
    private readonly messageRepo: MessageRepository,
  ) {}

  /** Create a chat (group or 1-on-1) */
  async createChat(currentUser: User, dto: CreateChatDto): Promise<Chat> {
    let chat: Chat;

    // --- Group chat ---
    if (dto.isGroup && dto.participants?.length && dto.groupName) {
      chat = await this.chatRepo.create({
        isGroup: true,
        groupName: dto.groupName,
        createdBy: currentUser,
      });

      const participants: ChatParticipant[] = [];

      // Add current user as admin
      participants.push(
        await this.participantRepo.create({
          chat,
          user: currentUser,
          userId: currentUser.id,
          isAdmin: true,
        }),
      );

      // Add other participants
      for (const userId of dto.participants) {
        participants.push(
          await this.participantRepo.create({
            chat,
            userId,
            isAdmin: false,
          }),
        );
      }

      chat.participants = participants;
      return this.chatRepo.update(chat.id, chat);
    }

    // --- 1-on-1 chat ---
    if (dto.participantId) {
      // Check if chat already exists
      const existingChats = await this.chatRepo['repository']
        .createQueryBuilder('chat')
        .leftJoinAndSelect('chat.participants', 'participant')
        .where('chat.isGroup = false')
        .getMany();

      const found = existingChats.find((c) =>
        c.participants.some(
          (p) =>
            (p.userId === currentUser.id && p.userId === dto.participantId) ||
            (p.userId === dto.participantId && p.userId === currentUser.id),
        ),
      );

      if (found) return found;

      chat = await this.chatRepo.create({
        isGroup: false,
        createdBy: currentUser,
      });

      chat.participants = [
        await this.participantRepo.create({
          chat,
          user: currentUser,
          userId: currentUser.id,
        }),
        await this.participantRepo.create({
          chat,
          userId: dto.participantId,
        }),
      ];

      return this.chatRepo.update(chat.id, chat);
    }

    throw new BadRequestException('Invalid chat creation data');
  }

  /** Get all chats for a user */
  async getUserChats(currentUser: User): Promise<Chat[]> {
    return this.chatRepo['repository']
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.participants', 'participant')
      .leftJoinAndSelect('participant.user', 'user')
      .leftJoinAndSelect('chat.lastMessage', 'lastMessage')
      .leftJoinAndSelect('lastMessage.sender', 'sender')
      .where('participant.userId = :id', { id: currentUser.id })
      .orderBy('chat.updatedAt', 'DESC')
      .getMany();
  }

  /** Get a single chat with participants and messages */
  async getSingleChat(chatId: string, currentUser: User): Promise<Chat> {
    const chat = await this.chatRepo['repository'].findOne({
      where: { id: chatId },
      relations: [
        'participants',
        'participants.user',
        'messages',
        'messages.sender',
        'messages.replyTo',
      ],
    });

    if (!chat) throw new NotFoundException('Chat not found');

    // Check if user is participant
    const isParticipant = chat.participants.some(
      (p) => p.userId === currentUser.id,
    );
    if (!isParticipant) throw new BadRequestException('Unauthorized');

    return chat;
  }

  /** Get messages for a room with pagination */
  async getRoomMessages(
    chatId: string,
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<Message[]> {
    // Verify user is participant
    const isParticipant = await this.participantRepo['repository']
      .createQueryBuilder('p')
      .where('p.chatId = :chatId', { chatId })
      .andWhere('p.userId = :userId', { userId })
      .getCount();

    if (!isParticipant) throw new BadRequestException('Unauthorized');

    // Fetch messages with pagination
    return this.messageRepo['repository']
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.chatId = :chatId', { chatId })
      .orderBy('message.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany()
      .then((msgs) => msgs.toReversed()); // oldest first
  }

  /** Send a message in a chat */
  async sendMessage(currentUser: User, dto: SendMessageDto): Promise<Message> {
    const chat = await this.chatRepo['repository'].findOne({
      where: { id: dto.chatId },
      relations: ['participants', 'participants.user'],
    });

    if (!chat) throw new NotFoundException('Chat not found');

    const isParticipant = chat.participants.some(
      (p) => p.userId === currentUser.id,
    );
    if (!isParticipant) throw new BadRequestException('Unauthorized');

    const message = await this.messageRepo.create({
      chat,
      chatId: chat.id,
      sender: currentUser,
      senderId: currentUser.id,
      content: dto.content,
      image: dto.image,
      replyToId: dto.replyToId,
    });

    // Update last message in chat
    await this.chatRepo.update(chat.id, { lastMessage: message });

    return message;
  }

  async verifyJwt(token: string): Promise<User> {
    try {
      // Type the payload explicitly
      const payload = this.jwtService.verify<JwtPayload>(token);

      const user = await this.userRepo.findOneById(payload.sub);
      if (!user) throw new UnauthorizedException('User not found');
      return user;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async getUserRoomIds(userId: string): Promise<string[]> {
    const chats = await this.chatRepo['repository']
      .createQueryBuilder('chat')
      .leftJoin('chat.participants', 'participant')
      .where('participant.userId = :id', { id: userId })
      .getMany();

    return chats.map((c) => c.id);
  }
}
