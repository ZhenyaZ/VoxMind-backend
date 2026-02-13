import { Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';

import { NLPService } from './nlp.service';

@Controller('nlp')
export class NLPController {
  constructor(private readonly nlpService: NLPService) {}

  @Post('transcribe')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async transcribeAudio(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    return await this.nlpService.transcribeAudio(req.user.id, file);
  }
}
