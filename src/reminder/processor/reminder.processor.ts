import { MikroORM } from '@mikro-orm/postgresql';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Expo } from 'expo-server-sdk';
import { ScheduledTasks } from 'src/entities/ScheduledTask.entity';
import { Users } from 'src/entities/User.entity';
import { UserPushToken } from 'src/entities/UserPushToken.entity';
import { NLPService } from 'src/nlp/nlp.service';
@Processor('reminder')
export class ReminderProcessor extends WorkerHost {
  private expo: Expo;

  constructor(
    private readonly orm: MikroORM,
    private readonly nlpService: NLPService,
  ) {
    super();
    this.expo = new Expo();
  }
  async process(job: Job): Promise<any> {
    const em = this.orm.em.fork();
    const { userId, message, taskId } = job.data;
    console.log(job.data);
    let tickets: any[] = [];
    try {
      const user = await em.findOne(Users, { id: userId });
      const pushTokens = await em.findAll(UserPushToken, { where: { user: user } });
      if (pushTokens.length === 0) {
        await em.nativeUpdate(ScheduledTasks, { id: taskId }, { status: 'CANCELLED' });
        return;
      }
      const formattedMessage = await this.nlpService.remindMessage(message);
      const messages = pushTokens.map((token) => {
        return {
          to: token.pushToken,
          body: formattedMessage!,
          badge: 1,
          data: { taskId: taskId, pushTokenId: token.id },
        };
      });
      const chunks = this.expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          for (let i = 0; i < ticketChunk.length; i++) {
            const ticket = ticketChunk[i];
            const tokenIdentifier = chunk[i].to;

            if (ticket.status === 'error') {
              const error = ticket.details?.error;

              if (error === 'DeviceNotRegistered') {
                await em.nativeDelete(UserPushToken, { pushToken: tokenIdentifier });
              } else {
                console.error(`Push error for ${tokenIdentifier}: ${ticket.message}`);
              }
            }
          }
        } catch (pushError) {
          console.error('Error sending chunk:', pushError);
        }
      }
      await em.nativeUpdate(ScheduledTasks, { id: taskId }, { status: 'DELIVERED' });
      await em.flush();
    } catch (error) {
      console.log(error);
      await em.nativeUpdate(ScheduledTasks, { id: taskId }, { status: 'ERROR' });
    }
  }
}
