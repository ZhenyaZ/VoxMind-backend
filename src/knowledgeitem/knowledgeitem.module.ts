import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { KnowledgeItem } from 'src/entities/KnowledgeItem.entity';
import { Users } from 'src/entities/User.entity';

import { KnowledgeitemController } from './knowledgeitem.controller';
import { KnowledgeitemService } from './knowledgeitem.service';

@Module({
  imports: [MikroOrmModule.forFeature([KnowledgeItem, Users])],
  controllers: [KnowledgeitemController],
  providers: [KnowledgeitemService],
  exports: [KnowledgeitemService],
})
export class KnowledgeitemModule {}
