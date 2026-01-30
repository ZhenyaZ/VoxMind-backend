import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/loginDto.dto';
import { RegisterDto } from './dto/registerDto.dto';
import { RefreshJwtAuthGuard } from './guard/refresh-jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Res() res) {
    const tokens = await this.authService.register(registerDto);
    res.cookie('accessToken', tokens.accessToken, { httpOnly: true, secure: true, sameSite: 'none' });
    res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, secure: true, sameSite: 'none' });
    return res.sendStatus(201);
  }
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res() res) {
    const { email, password } = loginDto;
    const tokens = await this.authService.login(email, password);
    res.cookie('accessToken', tokens.accessToken, { httpOnly: true, secure: true, sameSite: 'none' });
    res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, secure: true, sameSite: 'none' });
    return res.sendStatus(200);
  }
  @Get('refresh')
  @UseGuards(RefreshJwtAuthGuard)
  async refreshTokens(@Req() req, @Res() res) {
    const tokens = await this.authService.refreshTokens(req.user.id);
    res.cookie('accessToken', tokens.accessToken, { httpOnly: true, secure: true, sameSite: 'none' });
    res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, secure: true, sameSite: 'none' });
    return res.sendStatus(200);
  }
}
