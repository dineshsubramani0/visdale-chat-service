import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SendMessageDto } from 'src/dto/send-message.dto';
import { UsersRepository } from 'src/models-repository/user.model.repository';
import { User } from 'src/models/user.entity';
import * as jwt from 'jsonwebtoken';

/** Extend Socket with optional user data and auth token */
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
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly userRepo: UsersRepository,
  ) {}

  /** Helper: Find all sockets connected for a specific user ID */
  private async getSocketsByUserId(
    userId: string,
  ): Promise<AuthenticatedSocket[]> {
    const sockets: AuthenticatedSocket[] = [];
    const allSockets = await this.server.fetchSockets();

    for (const socket of allSockets) {
      const s = socket as unknown as AuthenticatedSocket;
      if (s.data?.user?.id === userId) sockets.push(s);
    }

    return sockets;
  }

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
      const userId = (payload as { sub?: string }).sub;

      if (!userId) {
        console.warn(`[WS] Invalid token payload, disconnecting ${client.id}`);
        return client.disconnect();
      }

      // Fetch user from DB
      const user = await this.userRepo
        .getRepo()
        .findOne({ where: { id: userId } });
      if (!user) {
        console.warn(`[WS] User not found, disconnecting ${client.id}`);
        return client.disconnect();
      }

      client.data.user = user;
      console.log(`[WS] User verified: ${user.id} (${user.first_name})`);

      // Join all rooms the user is part of
      const roomIds = await this.chatService.getUserRoomIds(user.id);
      for (const roomId of roomIds) {
        await client.join(roomId);
      }

      console.log(`[WS] Socket ${client.id} connected successfully`);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(err as string);
      console.error(
        `[WS] Connection error for socket ${client.id}:`,
        error.message,
      );
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

  /** Send a message to a chat room */
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

    try {
      console.log(`[WS] User ${user.id} sending message to chat ${dto.chatId}`);

      const message = await this.chatService.sendMessage(user, dto);

      // Emit to everyone in the room (including sender)
      this.server.to(dto.chatId).emit('newMessage', message);

      console.log(`[WS] Message emitted in room ${dto.chatId}`);
      return message;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(err as string);
      console.error(
        `[WS] Error sending message for user ${user.id}:`,
        error.message,
      );
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

  /** Handle adding new participants to a group via socket */
  @SubscribeMessage('addParticipants')
  async handleAddParticipants(
    @MessageBody()
    dto: { roomId: string; userIds: string[] },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const user = client.data.user;
    if (!user) {
      console.warn(
        `[WS] Unauthorized addParticipants attempt from ${client.id}`,
      );
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    const { roomId, userIds } = dto;
    if (!roomId || !userIds?.length) {
      client.emit('error', { message: 'Invalid addParticipants payload' });
      return;
    }

    try {
      console.log(`[WS] User ${user.id} adding participants to room ${roomId}`);

      // Update participants in DB
      const updatedRoom = await this.chatService.addParticipants(roomId, {
        userIds,
      });

      // Join new participants to the socket room if they are online
      for (const participant of updatedRoom.participants) {
        if (userIds.includes(participant.userId)) {
          const sockets = await this.getSocketsByUserId(participant.userId);

          for (const s of sockets) {
            await s.join(roomId);
          }
        }
      }

      // Notify everyone in the room about new participants
      this.server.to(roomId).emit('participantsAdded', {
        roomId,
        addedUserIds: userIds,
        addedBy: user.id,
        participants: updatedRoom.participants.map((p) => ({
          id: p.user.id,
          name: `${p.user.first_name} ${p.user.last_name ?? ''}`.trim(),
        })),
      });

      console.log(`[WS] Participants added to room ${roomId}:`, userIds);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(err as string);
      console.error(`[WS] Error adding participants:`, error.message);
      client.emit('error', { message: 'Failed to add participants' });
    }
  }
}
