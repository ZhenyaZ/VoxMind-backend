import { Controller } from '@nestjs/common';

import { KnowledgeitemService } from './knowledgeitem.service';

@Controller('knowledgeitem')
export class KnowledgeitemController {
  constructor(private readonly knowledgeitemService: KnowledgeitemService) {}
}
