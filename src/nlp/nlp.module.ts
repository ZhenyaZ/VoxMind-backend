import { MikroOrmModule } from '@mikro-orm/nestjs';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from 'src/auth/config/jwt.config';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';
import { KnowledgeItem } from 'src/entities/KnowledgeItem.entity';
import { ScheduledTasks } from 'src/entities/ScheduledTask.entity';
import { KnowledgeitemModule } from 'src/knowledgeitem/knowledgeitem.module';
import { ReminderModule } from 'src/reminder/reminder.module';
import { UserModule } from 'src/user/user.module';

import { NLPController } from './nlp.controller';
import { NLPService } from './nlp.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([KnowledgeItem, ScheduledTasks]),
    ConfigModule.forRoot({ isGlobal: true }),
    ConfigModule.forFeature(jwtConfig),
    forwardRef(() => KnowledgeitemModule),
    forwardRef(() => UserModule),
    forwardRef(() => ReminderModule),
  ],
  controllers: [NLPController],
  providers: [NLPService, JwtStrategy],
  exports: [NLPService],
})
export class NLPModule {}
