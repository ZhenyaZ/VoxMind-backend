import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { KnowledgeItem } from 'src/entities/KnowledgeItem.entity';
import { Users } from 'src/entities/User.entity';
import { NLPService } from 'src/nlp/nlp.service';
import { ConvertDistanceToPercentage } from 'src/utils/distanceToPercentage';

import CreateKnowledgeItemDto from './dto/create.dto';
import SearchKnowledgeItemDto from './dto/search.dto';

@Injectable()
export class KnowledgeitemService {
  constructor(
    @InjectRepository(KnowledgeItem) private readonly knowledgeItemRepository: EntityRepository<KnowledgeItem>,
    @InjectRepository(Users) private readonly usersRepository: EntityRepository<Users>,
    @Inject(forwardRef(() => NLPService))
    private readonly nlpService: NLPService,
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
  async semanticSearch(
    user: Users,
    queryVector: number[],
  ): Promise<
    {
      id: number;
      subject: string;
      content: string;
      type: string;
      distance: number;
    }[]
  > {
    const vectorString = `[${queryVector.join(',')}]`;

    const items = await this.knowledgeItemRepository.getEntityManager().execute(
      `
    SELECT id, subject, content, type, 
           (embedding <=> ?::vector) as distance
    FROM knowledge_item
    WHERE user_id = ? 
      AND (embedding <=> ?::vector) < 0.6
    ORDER BY distance ASC
    LIMIT 5; 
    `,
      [vectorString, user.id, vectorString],
    );
    items.forEach((item) => {
      item.score = ConvertDistanceToPercentage(item.distance);
    });
    return items as { id: number; subject: string; content: string; type: string; distance: number; score: string }[];
  }

  async getKnowledgeItems(userId: string) {
    const user = await this.usersRepository.findOne({ id: userId });
    const items = await this.knowledgeItemRepository.find(
      { user: user },
      { exclude: ['embedding', 'isQuestion', 'updatedAt', 'user', 'location', 'subject', 'dueDate'] },
    );
    return items;
  }
  async deleteKnowledgeItem(itemId: number) {
    return await this.knowledgeItemRepository.nativeDelete({ id: itemId });
  }

  async updateKnowledgeItem(itemId: number, content: string) {
    const item = await this.knowledgeItemRepository.findOne({ id: itemId });
    if (!item) {
      throw new NotFoundException(`Knowledge item ${itemId} not found`);
    }

    const updatedClassified = await this.nlpService.classifyAudio(content, item.user.id);

    const rawTags = updatedClassified.tags;
    const validatedTags = Array.isArray(rawTags) ? rawTags : rawTags ? [rawTags] : [];

    const contentForEmbedding = updatedClassified.content ?? content;
    const updatedEmbeddings = await this.nlpService.getEmbedding(contentForEmbedding);

    const updateData = {
      ...updatedClassified,
      content: content,
      subject: updatedClassified.subject,
      location: updatedClassified.location || null,
      tags: validatedTags,
      embedding: updatedEmbeddings,
    };

    this.em.assign(item, updateData);
    await this.em.flush();

    return item;
  }
}
