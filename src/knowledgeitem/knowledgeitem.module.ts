import { MikroOrmModule } from '@mikro-orm/nestjs';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from 'src/auth/config/jwt.config';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { KnowledgeItem } from 'src/entities/KnowledgeItem.entity';
import { Users } from 'src/entities/User.entity';
import { VoiceModule } from 'src/voice/voice.module';

import { KnowledgeitemController } from './knowledgeitem.controller';
import { KnowledgeitemService } from './knowledgeitem.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([KnowledgeItem, Users]),
    ConfigModule.forFeature(jwtConfig),
    forwardRef(() => VoiceModule),
  ],
  controllers: [KnowledgeitemController],
  providers: [KnowledgeitemService, JwtAuthGuard],
  exports: [KnowledgeitemService],
})
export class KnowledgeitemModule {}
