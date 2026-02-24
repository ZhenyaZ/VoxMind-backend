import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';

import { DAYS, ReminderProducerService } from './producer/reminder-producer/reminder-producer.service';

@Controller('reminder')
export class ReminderController {
  constructor(private readonly reminderProducerService: ReminderProducerService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createManualScheduledReminder(
    @Req() req,
    @Res() res,
    @Body() data: { message: string; date: string; days: DAYS[]; hours: string; minutes: string; repeat: boolean },
  ) {
    const response = await this.reminderProducerService.createManualScheduledTask(req.user.id, data);
    res.status(200).send(response);
  }
  @Get()
  @UseGuards(JwtAuthGuard)
  async getScheduledReminds(@Req() req, @Res() res) {
    const data = await this.reminderProducerService.getScheduledReminds(req.user.id);
    res.send(data);
  }
}
