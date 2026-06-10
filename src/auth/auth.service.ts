import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserPushToken } from 'src/entities/UserPushToken.entity';
import { UserService } from 'src/user/user.service';

import refreshJwtConfig from './config/refresh-jwt.config';
import { LoginDto } from './dto/loginDto.dto';
import { RegisterDto } from './dto/registerDto.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @Inject(refreshJwtConfig.KEY)
    private readonly refreshJwtConfig: ConfigType<any>,
    @InjectRepository(UserPushToken)
    private readonly userPushTokenRepository: EntityRepository<UserPushToken>,
    private readonly em: EntityManager,
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
      locale: registerDto.locale,
      timezone: registerDto.timezone,
    });

    return this.issueTokens(user.id, user);
  }

  async login(loginDto: LoginDto) {
    const user = await this.userService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Incorrect email address or password');
    }

    const isValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Incorrect email address or password');
    }
    user.password = '';
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

  async removePushToken(pushToken: string): Promise<void> {
    await this.userService.removePushToken(pushToken);
  }
}
