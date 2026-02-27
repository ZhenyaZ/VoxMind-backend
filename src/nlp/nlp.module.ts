import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from 'src/auth/config/jwt.config';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';
import { KnowledgeitemModule } from 'src/knowledgeitem/knowledgeitem.module';
import { ReminderModule } from 'src/reminder/reminder.module';
import { UserModule } from 'src/user/user.module';

import { NLPController } from './nlp.controller';
import { NLPService } from './nlp.service';

@Module({
  imports: [
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
