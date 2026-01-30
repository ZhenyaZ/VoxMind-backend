import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import jwtConfig from '../config/jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(@Inject(jwtConfig.KEY) jwtConfiguration: ConfigType<typeof jwtConfig>) {
    if (!jwtConfiguration.secret) {
      throw new Error('JWT secret is not defined in configuration');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const token = request.cookies?.['accessToken'] || request.headers.authorization?.replace('Bearer ', '');
          if (!token) {
            return new UnauthorizedException('JWT token not found');
          }
          return token;
        },
      ]),
      secretOrKey: jwtConfiguration.secret as string,
      ignoreExpiration: false,
    });
  }

  async validate(payload: { id: string }) {
    return {
      id: payload.id,
    };
  }
}
