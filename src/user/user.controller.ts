import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';

import { UpdatePushTokenDto } from './dto/updatePushToken.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Post('push-token')
  @UseGuards(JwtAuthGuard)
  async updatePushToken(@Req() req, @Res() res, @Body() data: UpdatePushTokenDto) {
    return await this.userService.updateUserPushToken(req.user.id, data);
  }
}
