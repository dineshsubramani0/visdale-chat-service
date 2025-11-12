import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from 'src/database/database.service';
import { User } from 'src/models/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UsersRepository extends BaseService<User> {
  constructor(@InjectRepository(User) userModel: Repository<User>) {
    super(userModel);
  }
}
