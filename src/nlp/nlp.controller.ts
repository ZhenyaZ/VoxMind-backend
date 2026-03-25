import { Body, Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';

import { NLPService } from './nlp.service';

@Controller('nlp')
export class NLPController {
  constructor(private readonly nlpService: NLPService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('process/voice')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async transcribeAudio(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    return await this.nlpService.transcribeAudio(req.user.id, file);
  }
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('process/text')
  @UseGuards(JwtAuthGuard)
  async processText(@Req() req, @Body() body: { content: string }) {
    return await this.nlpService.processText(req.user.id, body.content);
  }
}
