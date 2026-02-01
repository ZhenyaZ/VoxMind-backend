import { Body, Controller, Delete, Get, Req, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';

import { KnowledgeitemService } from './knowledgeitem.service';

@Controller('knowledgeitem')
export class KnowledgeitemController {
  constructor(private readonly knowledgeitemService: KnowledgeitemService) {}

  @Get('list')
  @UseGuards(JwtAuthGuard)
  async getKnowledgeItems(@Req() req, @Res() res) {
    const items = await this.knowledgeitemService.getKnowledgeItems(req.user.id);
    res.send(items);
  }
  @Delete()
  @UseGuards(JwtAuthGuard)
  async deleteKnowledgeItem(@Req() req, @Res() res, @Body() body: { itemId: number }) {
    const items = await this.knowledgeitemService.deleteKnowledgeItem(body.itemId);
    res.status(200).send(items);
  }
}
