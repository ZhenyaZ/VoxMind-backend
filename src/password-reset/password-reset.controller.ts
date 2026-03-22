import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';

import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetVerifyDto } from './dto/password-reset-verify.dto';
import { PasswordResetService } from './password-reset.service';

@Controller('password-reset')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Post()
  async resetPassword(@Body() body: PasswordResetRequestDto) {
    return await this.passwordResetService.sendCode(body.email);
  }

  @Post('verify')
  async verifyCode(@Body() body: PasswordResetVerifyDto) {
    return await this.passwordResetService.verify(body.email, body.code, body.newPassword);
  }
}
