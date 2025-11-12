// src/chat/chat.controller.ts
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CurrentUser } from 'src/@types/decorators/current-user.decorator';
import { AuthGuard } from 'src/guard/auth.guard';
import { User } from 'src/models/user.entity';
import { CreateChatDto } from 'src/dto/create-chat.dto';
import { SendMessageDto } from 'src/dto/send-message.dto';
import { PaginateMessagesDto } from 'src/dto/paginate-messages.dto';
import { AddParticipantsDto } from 'src/dto/add-participants.dto';
import { plainToInstance } from 'class-transformer';
import { ChatResponseDto } from 'src/dto/chat-response.dto';

@Controller('rooms')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** Create a new chat room (group or 1-on-1) */
  @Post()
  async createChat(@CurrentUser() user: User, @Body() dto: CreateChatDto) {
    const chat = await this.chatService.createChat(user, dto);
    return plainToInstance(ChatResponseDto, chat, {
      excludeExtraneousValues: true,
    });
  }

  /** Add participants to an existing room */
  @Post(':id/add-participants')
  async addParticipants(
    @CurrentUser() user: User,
    @Param('id') roomId: string,
    @Body() dto: AddParticipantsDto,
  ) {
    // Optional: you can check if currentUser is admin of the group here
    const updatedRoom = await this.chatService.addParticipants(roomId, dto);
    return plainToInstance(ChatResponseDto, updatedRoom, {
      excludeExtraneousValues: true,
    });
  }

  /** List all chats for current user */
  @Get()
  async listRooms(@CurrentUser() currentUser: User) {
    return this.chatService.getUserChats(currentUser);
  }

  /** Get single chat details */
  @Get(':id')
  async getRoom(@CurrentUser() currentUser: User, @Param('id') chatId: string) {
    return this.chatService.getSingleChat(chatId, currentUser);
  }

  /** Get messages of a chat with optional pagination */
  @Get(':id/messages')
  async getRoomMessages(
    @CurrentUser() currentUser: User,
    @Param('id') chatId: string,
    @Query() query?: PaginateMessagesDto,
  ) {
    const limit = query?.limit ? Number(query.limit) : undefined;
    const offset = query?.offset ? Number(query.offset) : undefined;

    if (limit !== undefined || offset !== undefined) {
      return this.chatService.getRoomMessages(
        chatId,
        currentUser.id,
        limit,
        offset,
      );
    }

    const chat = await this.chatService.getSingleChat(chatId, currentUser);
    return chat.messages;
  }

  /** Send a message in a chat */
  @Post(':id/message')
  async sendMessage(
    @CurrentUser() currentUser: User,
    @Param('id') chatId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(currentUser, { ...dto, chatId });
  }

  /** List all available users */
  @Get('user/list')
  async listUsers() {
    const users = await this.chatService.getAllUsers();
    return users.map((u) => ({
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      avatarUrl: u.avatar_url || '/avatars/default.jpg',
      isOnline: u.is_online,
    }));
  }
}
