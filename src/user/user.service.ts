import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { Users } from 'src/entities/User.entity';

import createUserDto from './dto/createUser.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: EntityRepository<Users>,
    private readonly em: EntityManager,
  ) {}

  async createUser(createUserDto: createUserDto): Promise<Users> {
    const newUser = this.usersRepository.create(createUserDto);
    await this.em.persist(newUser).flush();
    return newUser;
  }
  async userExists(email: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({ email });
    return !!user;
  }
  async findByEmail(email: string) {
    const user = await this.usersRepository.findOne({ email });
    if (!user) {
      return null;
    }
    return user;
  }
  async findById(id: string) {
    const user = await this.usersRepository.findOne({ id });
    if (!user) {
      return null;
    }
    return user;
  }
}
