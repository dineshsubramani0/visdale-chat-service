// src/chat/chat.gateway.ts
import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SendMessageDto } from 'src/dto/send-message.dto';
import { User } from 'src/models/user.entity';

interface AuthenticatedSocket extends Socket {
  data: { user: User };
}

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly chatService: ChatService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.query.token as string;
      if (!token) return client.disconnect();

      const user = await this.chatService.verifyJwt(token);
      if (!user) return client.disconnect();

      client.data.user = user;

      const roomIds = await this.chatService.getUserRoomIds(user.id);
      for (const roomId of roomIds) await client.join(roomId);

      console.log(`User connected: ${user.id}, rooms: ${roomIds.join(', ')}`);
    } catch (error) {
      console.error('Socket connection error', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data.user;
    console.log(`User disconnected: ${client.id}, user: ${user?.id}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() dto: SendMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = client.data.user;
    if (!user) throw new Error('Unauthorized');

    const message = await this.chatService.sendMessage(user, dto);

    // Broadcast to all participants including sender
    client.to(dto.chatId).emit('newMessage', message);
    client.emit('newMessage', message);

    return message;
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() { chatId }: { chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = client.data.user;
    if (!user) return;

    client.to(chatId).emit('typing', { chatId, userName: user.first_name });
  }
}
