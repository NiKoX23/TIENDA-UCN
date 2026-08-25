import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
        jwtFromRequest: (req: Request) => req?.cookies?.access_token ?? null,
        ignoreExpiration: false,
        secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: { sub: number; email: string; esAdmin: boolean }) {
        return { uid: payload.sub, email: payload.email, esAdmin: payload.esAdmin };
  }
}

