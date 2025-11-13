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
import { UsersRepository } from 'src/models-repository/user.model.repository';
import { User } from 'src/models/user.entity';
import * as jwt from 'jsonwebtoken';

// Extend Socket with optional user data and auth token
interface SocketAuth {
  token?: string;
}

interface AuthenticatedSocket extends Socket {
  data: { user?: User };
  handshake: Socket['handshake'] & { auth: SocketAuth };
}

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: process.env.FRONTEND_URL || '*', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly chatService: ChatService,
    private readonly userRepo: UsersRepository,
  ) {}

  /** Handle new client connection */
  async handleConnection(client: AuthenticatedSocket) {
    console.log(`[WS] New connection: ${client.id}`);

    try {
      const token = client.handshake.auth?.token;
      if (!token) {
        console.warn(`[WS] No token provided, disconnecting ${client.id}`);
        return client.disconnect();
      }

      if (!process.env.JWT_SECRET_KEY) {
        console.error('[WS] JWT_SECRET_KEY not set in environment');
        return client.disconnect();
      }

      // Verify JWT
      const payload = jwt.verify(token, process.env.JWT_SECRET_KEY);

      // Extract user ID from 'sub' field
      const userId = (payload as { sub?: string }).sub;
      if (!userId) {
        console.warn(`[WS] Invalid token payload, disconnecting ${client.id}`);
        return client.disconnect();
      }

      // Fetch user from database
      const user = await this.userRepo
        .getRepo()
        .findOne({ where: { id: userId } });
      if (!user) {
        console.warn(`[WS] User not found, disconnecting ${client.id}`);
        return client.disconnect();
      }

      client.data.user = user;
      console.log(`[WS] User verified: ${user.id} (${user.first_name})`);

      // Join all chat rooms for this user
      const roomIds = await this.chatService.getUserRoomIds(user.id);
      console.log(`[WS] User ${user.id} joining rooms: ${roomIds.join(', ')}`);
      for (const roomId of roomIds) {
        await client.join(roomId);
      }

      console.log(`[WS] Socket ${client.id} connected successfully`);
    } catch (error) {
      console.error(`[WS] Connection error for socket ${client.id}:`, error);
      client.disconnect();
    }
  }

  /** Handle client disconnect */
  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data.user;
    console.log(
      `[WS] Socket disconnected: ${client.id}, User: ${user?.id || 'Unknown'}`,
    );
  }

  /** Send message to a chat room */
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() dto: SendMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = client.data.user;
    if (!user) {
      console.warn(`[WS] Unauthorized message attempt from ${client.id}`);
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    console.log(
      `[WS] User ${user.id} sending message to chat ${dto.chatId}:`,
      dto,
    );

    try {
      const message = await this.chatService.sendMessage(user, dto);

      // Emit to all other participants
      client.to(dto.chatId).emit('newMessage', message);

      // Emit back to sender
      client.emit('newMessage', message);

      console.log(`[WS] Message emitted in room ${dto.chatId}`);
      return message;
    } catch (error) {
      console.error(`[WS] Error sending message for user ${user.id}:`, error);
      client.emit('error', { message: 'Message sending failed' });
    }
  }

  /** Handle typing indicator */
  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() { chatId }: { chatId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = client.data.user;
    if (!user) {
      console.warn(`[WS] Unauthorized typing attempt from ${client.id}`);
      return;
    }

    console.log(`[WS] User ${user.id} is typing in chat ${chatId}`);
    client.to(chatId).emit('typing', {
      chatId,
      userId: user.id,
      userName: user.first_name,
    });
  }
}
