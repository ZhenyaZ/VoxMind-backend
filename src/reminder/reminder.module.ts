import { MikroOrmModule } from '@mikro-orm/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from 'src/auth/config/jwt.config';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';
import { ScheduledTasks } from 'src/entities/ScheduledTask.entity';
import { NLPModule } from 'src/nlp/nlp.module';
import { UserModule } from 'src/user/user.module';

import { ReminderProcessor } from './processor/reminder.processor';
import { ReminderProducerService } from './producer/reminder-producer/reminder-producer.service';
import { ReminderController } from './reminder.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'reminder',
    }),
    ConfigModule.forFeature(jwtConfig),
    MikroOrmModule.forFeature([ScheduledTasks]),
    UserModule,
    forwardRef(() => NLPModule),
  ],
  providers: [ReminderProducerService, ReminderProcessor, JwtStrategy],
  exports: [ReminderProducerService],
  controllers: [ReminderController],
})
export class ReminderModule {}
