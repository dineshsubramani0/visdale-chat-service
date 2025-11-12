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
  data: {
    user: User;
  };
}

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: process.env.FRONTEND_URL },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Handle new client connection
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.query.token as string;
      if (!token) {
        client.disconnect();
        return;
      }

      // Verify JWT and get user
      const user = await this.chatService.verifyJwt(token);
      if (!user) {
        client.disconnect();
        return;
      }

      client.data.user = user;

      // Join all rooms (use for…of for async)
      const roomIds = await this.chatService.getUserRoomIds(user.id);
      for (const roomId of roomIds) {
        await client.join(roomId);
      }

      console.log(
        `User connected: ${user.id}, joined rooms: ${roomIds.join(', ')}`,
      );
    } catch (error) {
      console.error('WebSocket connection error', error);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data.user;
    console.log(`Client disconnected: ${client.id}, user: ${user?.id}`);
  }

  /**
   * Listen to 'sendMessage' events
   */
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() dto: SendMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = client.data.user;
    if (!user) throw new Error('Unauthorized');

    // Save message via service
    const message = await this.chatService.sendMessage(user, dto);

    // Broadcast to all participants including sender
    client.to(dto.chatId).emit('newMessage', message); // all others
    client.emit('newMessage', message); // sender

    return message;
  }
}
