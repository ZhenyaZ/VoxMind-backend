import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Users } from 'src/entities/User.entity';
import { UserPushToken } from 'src/entities/UserPushToken.entity';

import createUserDto from './dto/createUser.dto';
import { UpdatePushTokenDto } from './dto/updatePushToken.dto';
import { ReminderProducerService } from 'src/reminder/producer/reminder-producer/reminder-producer.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: EntityRepository<Users>,
    @InjectRepository(UserPushToken)
    private readonly userPushTokenRepository: EntityRepository<UserPushToken>,
    private readonly reminderProducerService: ReminderProducerService,
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
  async deleteUserAccount(id: string) {
    const user = await this.usersRepository.findOne({ id });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.reminderProducerService.getAllReminds(id).then(async (tasks) => {
      for (const task of tasks) {
        await this.reminderProducerService.deleteRemind(id, task.taskId);
        console.log(`Deleted task with ID: ${task.taskId} for user ID: ${id}`);
      }
    });
    await this.em.remove(user).flush();
    console.log(`Deleted user with ID: ${id} and all associated data`);
    return { message: 'User deleted successfully' };
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
