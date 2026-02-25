import { Body, Controller, Delete, Get, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
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
  @Put()
  @UseGuards(JwtAuthGuard)
  async updateScheduledRemind(
    @Req() req,
    @Res() res,
    @Body()
    body: { taskId: string; message: string; date: string; days: DAYS[]; hours: string; minutes: string; repeat: boolean },
  ) {
    const response = await this.reminderProducerService.updateScheduleRemind(req.user.id, body);
    res.status(200).send(response);
  }
  @Delete()
  @UseGuards(JwtAuthGuard)
  async deleteScheduledRemind(@Req() req, @Res() res, @Body() body: { taskId: string }) {
    const response = await this.reminderProducerService.deleteRemind(req.user.id, body.taskId);
    res.status(200).send(response);
  }
}
