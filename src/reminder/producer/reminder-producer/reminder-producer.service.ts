import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ScheduledTasks } from 'src/entities/ScheduledTask.entity';
import { NLPService } from 'src/nlp/nlp.service';
import { UserService } from 'src/user/user.service';
export enum DAYS {
  'MON' = 1,
  'TUE' = 2,
  'WED' = 3,
  'THU' = 4,
  'FRI' = 5,
  'SAT' = 6,
  'SUN' = 7,
}
@Injectable()
export class ReminderProducerService {
  constructor(
    @InjectQueue('reminder')
    private readonly reminderQueue: Queue,
    @InjectRepository(ScheduledTasks) private readonly scheduledTasks: EntityRepository<ScheduledTasks>,
    private readonly userService: UserService,
    @Inject(forwardRef(() => NLPService))
    private readonly nlpService: NLPService,
    private readonly em: EntityManager,
  ) {}

  async getScheduledReminds(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const scheduledReminds = await this.scheduledTasks.findAll({
      where: { user: user, addedByUser: true },
      exclude: ['taskId', 'user'],
    });
    return scheduledReminds;
  }

  async createScheduleRemind(userId: string, message: string, delay: number) {
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
  async createManualScheduledTask(
    userId: string,
    data: { message: string; date: string; days: DAYS[]; hours: string; minutes: string; repeat: boolean },
  ) {
    const user = await this.userService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const daysNum = data.days.map((day) => DAYS[day]);
    const pattern = `${data.minutes} ${data.hours} * * ${daysNum.join(',')}`;
    let job;
    if (data.repeat) {
      //* Repeated tasks
      job = await this.reminderQueue.add(
        'send-reminder',
        {
          userId: userId,
          message: data.message,
        },
        {
          repeat: {
            pattern,
          },
        },
      );
      const task = await this.scheduledTasks.create({
        user: user,
        taskId: job.id!,
        delay: 0,
        addedByUser: true,
        pattern: pattern,
        message: data.message,
        repeated: data.repeat,
        status: 'SCHEDULED',
      });
      await this.em.persist(task).flush();
      await job.updateData({ userId, message: data.message, taskId: task.id });
      return task;
    } else {
      //* not repeated tasks
      const endDate = new Date(data.date);
      let currentDate = new Date();
      const delay = endDate.getTime() - currentDate.getTime();
      if (delay < 0) {
        throw new BadRequestException(`Past moments can't be scheduled. Set a future time.`);
      }
      const job = await this.reminderQueue.add(
        'send-reminder',
        { userId, message: data.message },
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
        message: data.message,
        addedByUser: true,
        status: 'SCHEDULED',
      });
      await this.em.persist(task).flush();
      await job.updateData({ userId, message: data.message, taskId: task.id });
      return job;
    }
  }
}
