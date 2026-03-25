import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MikroORM } from '@mikro-orm/postgresql';
import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BullMQConfig } from './config/bullmq.config';
import { KnowledgeitemModule } from './knowledgeitem/knowledgeitem.module';
import { NLPModule } from './nlp/nlp.module';
import { PasswordResetModule } from './password-reset/password-reset.module';
import { RedisModule } from './redis/redis.module';
import { ReminderModule } from './reminder/reminder.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    NLPModule,
    UserModule,
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    BullMQConfig,
    RedisModule,
    MikroOrmModule.forRoot(),
    KnowledgeitemModule,
    ReminderModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 60,
        },
      ],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.ENV === 'production' ? 'info' : 'debug',

        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers.set-cookie',
            'req.body.password',
            'req.body.accessToken',
            'req.body.refreshToken',
            'req.body.token',
            'res.headers["set-cookie"]',
          ],
          censor: '[REDACTED]',
        },

        customProps: () => ({
          service: 'backend',
        }),

        customSuccessMessage: () => 'request completed',
        customErrorMessage: () => 'request failed',

        serializers: {
          req(req) {
            return {
              id: req.id,
              method: req.method,
              url: req.url,
              remoteAddress: req.remoteAddress,
              remotePort: req.remotePort,
            };
          },
          res(res) {
            return {
              statusCode: res.statusCode,
            };
          },
        },

        customAttributeKeys: {
          req: 'req',
          res: 'res',
          responseTime: 'responseTime',
        },
      },
    }),
    PasswordResetModule,
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
