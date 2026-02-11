import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from 'src/auth/config/jwt.config';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';
import { KnowledgeitemModule } from 'src/knowledgeitem/knowledgeitem.module';
import { UserModule } from 'src/user/user.module';

import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ConfigModule.forFeature(jwtConfig),
    forwardRef(() => KnowledgeitemModule),
    UserModule,
  ],
  controllers: [VoiceController],
  providers: [VoiceService, JwtStrategy],
  exports: [VoiceService],
})
export class VoiceModule {}
