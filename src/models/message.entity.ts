import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Chat } from './chat.entity';
import { User } from './user.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Chat, (chat) => chat.messages)
  chat: Chat;

  @Column()
  chatId: string;

  @ManyToOne(() => User, { eager: true })
  sender: User;

  @Column()
  senderId: string;

  @Column({ nullable: true })
  content: string;

  @Column({ nullable: true })
  image: string;

  // SELF-RELATION: replyTo
  @ManyToOne(() => Message, (message) => message.replies, { nullable: true })
  @JoinColumn({ name: 'replyToId' })
  replyTo?: Message;

  @OneToMany(() => Message, (message) => message.replyTo)
  replies?: Message[];

  @Column({ nullable: true })
  replyToId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
