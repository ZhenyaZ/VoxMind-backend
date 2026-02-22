import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Users } from 'src/entities/User.entity';
import { UserPushToken } from 'src/entities/UserPushToken.entity';

import createUserDto from './dto/createUser.dto';
import { UpdatePushTokenDto } from './dto/updatePushToken.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: EntityRepository<Users>,
    @InjectRepository(UserPushToken)
    private readonly userPushTokenRepository: EntityRepository<UserPushToken>,
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
  async updateUserPushToken(userId: string, data: UpdatePushTokenDto) {
    const user = await this.findById(userId);
    if (!user) return new NotFoundException('User not found');
    return await this.userPushTokenRepository.upsert({
      user: user,
      deviceId: data.deviceId,
      platform: data.platform,
      pushToken: data.pushToken,
      deviceName: data.deviceName,
    });
  }
}
