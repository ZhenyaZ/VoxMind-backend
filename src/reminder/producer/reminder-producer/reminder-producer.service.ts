import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ScheduledTasks } from 'src/entities/ScheduledTask.entity';
import { UserService } from 'src/user/user.service';

@Injectable()
export class ReminderProducerService {
  constructor(
    @InjectQueue('reminder')
    private readonly reminderQueue: Queue,
    @InjectRepository(ScheduledTasks) private readonly scheduledTasks: EntityRepository<ScheduledTasks>,
    private readonly userService: UserService,
    private readonly em: EntityManager,
  ) {}

  async createScheldueRemind(userId: string, message: string, delay: number) {
    const user = await this.userService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const job = await this.reminderQueue.add(
      'send-reminder',
      { userId, message },
      {
        delay: delay,
        attempts: 3,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    const task = await this.scheduledTasks.create({
      user: user,
      taskId: job.id!,
      delay: delay,
      message: message,
      status: 'SCHEDULED',
    });
    await this.em.persist(task).flush();
    await job.updateData({ userId, message, taskId: task.id });
    return job;
  }
}
