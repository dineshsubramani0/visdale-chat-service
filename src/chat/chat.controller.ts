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

@Controller('rooms')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** Create a new chat room (group or 1-on-1) */
  @Post()
  async createRoom(
    @CurrentUser() currentUser: User,
    @Body() createChatDto: CreateChatDto,
  ) {
    return this.chatService.createChat(currentUser, createChatDto);
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
    // Convert query params to numbers safely
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
}
