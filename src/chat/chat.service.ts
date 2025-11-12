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
import { UserStatus } from 'src/@types/enums/status.enum';
import { AddParticipantsDto } from 'src/dto/add-participants.dto';
import { In } from 'typeorm';

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
    // --- GROUP CHAT ---
    if (dto.isGroup && dto.participants?.length && dto.groupName) {
      const repo = this.chatRepo.getRepo();
      const groupName = dto.groupName.trim();

      // 1️⃣ Check for existing group name (case-insensitive)
      const existingGroup = await repo
        .createQueryBuilder('chat')
        .where('LOWER(chat.groupName) = LOWER(:groupName)', { groupName })
        .andWhere('chat.isGroup = true')
        .getOne();

      if (existingGroup) {
        throw new BadRequestException(
          `A group with the name ${groupName} already exists.`,
        );
      }

      // Create and save the group chat
      const chat = repo.create({
        isGroup: true,
        groupName,
        createdBy: currentUser,
      });

      await repo.save(chat);

      //  Ensure unique participants (exclude creator)
      const uniqueParticipantIds = Array.from(
        new Set(dto.participants.filter((id) => id !== currentUser.id)),
      );

      //  Create all participant entries (admin + others)
      const participants: ChatParticipant[] = await Promise.all([
        this.participantRepo.create({
          chat,
          user: currentUser,
          userId: currentUser.id,
          isAdmin: true,
        }),
        ...uniqueParticipantIds.map((userId) =>
          this.participantRepo.create({
            chat,
            userId,
            isAdmin: false,
          }),
        ),
      ]);

      //  Save participants
      await this.participantRepo.getRepo().save(participants);

      chat.participants = participants;
      return chat;
    }

    // --- 1-ON-1 CHAT ---
    if (!dto.isGroup && dto.participantId) {
      const repo = this.chatRepo.getRepo();

      // Check if 1-on-1 chat already exists
      const existingChat = await repo
        .createQueryBuilder('chat')
        .innerJoin('chat.participants', 'p1')
        .innerJoin('chat.participants', 'p2')
        .where('chat.isGroup = false')
        .andWhere('p1.userId = :user1', { user1: currentUser.id })
        .andWhere('p2.userId = :user2', { user2: dto.participantId })
        .getOne();

      if (existingChat) return existingChat;

      // Create a new 1-on-1 chat
      const chat = repo.create({
        isGroup: false,
        createdBy: currentUser,
      });
      await repo.save(chat);

      const participants = await Promise.all([
        this.participantRepo.create({
          chat,
          user: currentUser,
          userId: currentUser.id,
        }),
        this.participantRepo.create({
          chat,
          userId: dto.participantId,
        }),
      ]);

      await this.participantRepo.getRepo().save(participants);
      chat.participants = participants;
      return chat;
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

  /** Get all users with status 'CREATED' */
  async getAllUsers(): Promise<
    {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      avatar_url?: string;
      is_online?: boolean;
    }[]
  > {
    const users = await this.userRepo.getRepo().find({
      where: { status: UserStatus.CREATED },
    });

    return users.map((u) => ({
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      avatar_url: u.avatar_url || '/avatars/default.jpg',
      is_online: u.is_online,
    }));
  }

  async addParticipants(roomId: string, dto: AddParticipantsDto) {
    // Fetch the room
    const room = await this.chatRepo.getRepo().findOne({
      where: { id: roomId },
      relations: ['participants', 'participants.user'],
    });
    if (!room) throw new NotFoundException('Room not found');

    // Fetch users safely
    const users = await this.userRepo.getRepo().find({
      where: { id: In(dto.userIds) },
    });
    if (!users.length) throw new NotFoundException('No valid users found');

    // Filter out already existing participants
    const existingParticipantIds = new Set(
      room.participants.map((p) => p.user.id),
    );

    const newParticipants = users
      .filter((u) => !existingParticipantIds.has(u.id))
      .map((u) => {
        const participant = new ChatParticipant();
        participant.user = u;
        participant.chat = room;
        participant.userId = u.id;
        return participant;
      });

    // Save new participants
    await this.participantRepo.getRepo().save(newParticipants);

    // Return updated room with participants
    return this.chatRepo.getRepo().findOne({
      where: { id: roomId },
      relations: ['participants', 'participants.user'],
    });
  }
}
