import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { PasswordResetService } from './password-reset.service';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetVerifyDto } from './dto/password-reset-verify.dto';

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
