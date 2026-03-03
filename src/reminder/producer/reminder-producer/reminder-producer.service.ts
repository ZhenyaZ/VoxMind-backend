import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DateTime } from 'luxon';
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
    @Inject(forwardRef(() => UserService))
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
      exclude: ['user'],
    });
    return scheduledReminds;
  }
  async getAllReminds(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const scheduledReminds = await this.scheduledTasks.findAll({
      where: { user: user },
      exclude: ['user'],
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
    return { job, task };
  }
  async createManualScheduledTask(
    userId: string,
    data: { message: string; date: string; days: DAYS[]; hours: string; minutes: string; repeat: boolean },
  ) {
    const user = await this.userService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const userTimezone = await this.userService.getUserTimezone(userId);
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
            tz: userTimezone,
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
      const endDateUtc = DateTime.fromISO(data.date, { zone: userTimezone }).toUTC();
      const delay = endDateUtc.toMillis() - Date.now();
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
  async updateScheduleRemind(
    userId: string,
    data: { taskId: string; message: string; date: string; days: DAYS[]; hours: string; minutes: string; repeat: boolean },
  ) {
    console.log(data);
    const user = await this.userService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const userTimezone = await this.userService.getUserTimezone(userId);
    const task = await this.scheduledTasks.findOne({ taskId: data.taskId, user: user });
    if (!task) throw new NotFoundException('Task not found');
    if (task.pattern) {
      const job = await this.reminderQueue.getJobScheduler(task.taskId);
      await this.reminderQueue.removeJobScheduler(job!.id!);
    } else {
      await this.reminderQueue.remove(task.taskId);
    }
    const daysNum = data.days.map((day) => DAYS[day]);
    const pattern = `${data.minutes} ${data.hours} * * ${daysNum.join(',')}`;
    let job;
    if (data.repeat) {
      job = await this.reminderQueue.add(
        'send-reminder',
        {
          userId: userId,
          message: data.message,
        },
        {
          repeat: {
            pattern,
            tz: userTimezone,
          },
        },
      );
      task.taskId = job.id!;
      task.pattern = pattern;
      task.message = data.message;
      task.repeated = data.repeat;
      task.status = 'SCHEDULED';
      await this.em.nativeUpdate(ScheduledTasks, { id: task.id }, task);
      await job.updateData({ userId, message: data.message, taskId: task.id });
      return task;
    } else {
      const endDateUtc = DateTime.fromISO(data.date, { zone: userTimezone }).toUTC();
      const delay = endDateUtc.toMillis() - Date.now();
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
      task.taskId = job.id!;
      task.delay = delay;
      task.message = data.message;
      task.addedByUser = true;
      task.repeated = data.repeat;
      task.status = 'SCHEDULED';
      await this.em.nativeUpdate(ScheduledTasks, { id: task.id }, task);
      await job.updateData({ userId, message: data.message, taskId: task.id });
      return task;
    }
  }
  async deleteRemind(userId: string, taskId: string) {
    const user = await this.userService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const task = await this.scheduledTasks.findOne({ taskId: taskId, user: user });
    if (!task) throw new NotFoundException('Task not found');
    if (task.pattern) {
      const job = await this.reminderQueue.getJobScheduler(taskId);
      await this.reminderQueue.removeJobScheduler(job!.id!);
    } else {
      await this.reminderQueue.remove(task.taskId);
    }
    await this.em.nativeDelete(ScheduledTasks, { id: task.id });
    return { message: 'Task deleted successfully' };
  }
}
