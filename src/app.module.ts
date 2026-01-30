import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MikroORM } from '@mikro-orm/postgresql';
import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { KnowledgeitemModule } from './knowledgeitem/knowledgeitem.module';
import { UserModule } from './user/user.module';
import { VoiceModule } from './voice/voice.module';

@Module({
  imports: [
    VoiceModule,
    UserModule,
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    MikroOrmModule.forRoot(),
    KnowledgeitemModule,
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
