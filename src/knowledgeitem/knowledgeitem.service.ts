import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { KnowledgeItem } from 'src/entities/KnowledgeItem.entity';

import CreateKnowledgeItemDto from './dto/create.dto';
import SearchKnowledgeItemDto from './dto/search.dto';

@Injectable()
export class KnowledgeitemService {
  constructor(
    @InjectRepository(KnowledgeItem) private readonly knowledgeItemRepository: EntityRepository<KnowledgeItem>,
    private readonly em: EntityManager,
  ) {}

  async createKnowledgeItem(createKnowledgeItemDto: CreateKnowledgeItemDto) {
    const knowledgeItem = this.knowledgeItemRepository.create(createKnowledgeItemDto);
    await this.em.persist(knowledgeItem).flush();
    return knowledgeItem;
  }

  async searchKnowledgeItem(searchKnowledgeItemDto: SearchKnowledgeItemDto) {
    const { user, subject } = searchKnowledgeItemDto;
    const searchResults = await this.knowledgeItemRepository.find({
      user: user,
      subject: { $like: `%${subject}%` },
    });
    return searchResults[0]?.content || null;
  }
}
