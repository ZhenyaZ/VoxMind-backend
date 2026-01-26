import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [VoiceController],
  providers: [VoiceService],
})
export class VoiceModule {}
