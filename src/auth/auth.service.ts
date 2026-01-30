import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from 'src/user/user.service';

import refreshJwtConfig from './config/refresh-jwt.config';
import { RegisterDto } from './dto/registerDto.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @Inject(refreshJwtConfig.KEY)
    private readonly refreshJwtConfig: ConfigType<any>,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, name, password } = registerDto;
    const exists = await this.userService.userExists(email);
    if (exists) {
      throw new BadRequestException('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.userService.createUser({
      email,
      name: name,
      password: passwordHash,
    });

    return this.issueTokens(user.id, user);
  }

  async login(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user.id, user);
  }

  private async issueTokens(userId: string, user: any) {
    const payload = { id: userId };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(payload, this.refreshJwtConfig);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(userId: string) {
    const payload = { id: userId };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(payload, this.refreshJwtConfig);

    return {
      accessToken,
      refreshToken,
    };
  }
}
