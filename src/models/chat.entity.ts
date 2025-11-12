import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Message } from './message.entity';
import { ChatParticipant } from './chat-participant.entity';

@Entity('chats')
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: false })
  isGroup: boolean;

  @Column({ nullable: true, length: 50 })
  groupName: string;

  @ManyToOne(() => User, { eager: true })
  createdBy: User;

  @OneToMany(() => ChatParticipant, (p) => p.chat, {
    cascade: true,
    eager: true,
  })
  participants: ChatParticipant[];

  @OneToMany(() => Message, (m) => m.chat)
  messages: Message[];

  @ManyToOne(() => Message, { nullable: true, eager: true })
  lastMessage?: Message;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
