import { Body, Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';

import { NLPService } from './nlp.service';

@Controller('nlp')
export class NLPController {
  constructor(private readonly nlpService: NLPService) {}

  @Post('process/voice')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async transcribeAudio(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    return await this.nlpService.transcribeAudio(req.user.id, file);
  }
  @Post('process/text')
  @UseGuards(JwtAuthGuard)
  async processText(@Req() req, @Body() body: { content: string }) {
    return await this.nlpService.processText(req.user.id, body.content);
  }
}
