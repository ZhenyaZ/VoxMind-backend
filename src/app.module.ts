import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MikroORM } from '@mikro-orm/postgresql';
import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BullMQConfig } from './config/bullmq.config';
import { KnowledgeitemModule } from './knowledgeitem/knowledgeitem.module';
import { NLPModule } from './nlp/nlp.module';
import { ReminderModule } from './reminder/reminder.module';
import { UserModule } from './user/user.module';
import { LoggerModule } from 'nestjs-pino';
@Module({
  imports: [
    NLPModule,
    UserModule,
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    BullMQConfig,
    MikroOrmModule.forRoot(),
    KnowledgeitemModule,
    ReminderModule,
    LoggerModule.forRoot({
  pinoHttp: {
    level: 'info',
  },
})
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly orm: MikroORM) {}
  async onModuleInit() {
    await this.orm.schema.updateSchema();
  }
}
