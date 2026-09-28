import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
	handleRequest<TUser = any>(_error: unknown, user: TUser): TUser {
		return (user || null) as TUser;
	}
}
