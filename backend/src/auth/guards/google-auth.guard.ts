import {ExecutionContext, Injectable, ServiceUnavailableException} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
	constructor(private config: ConfigService) {
		super();
	}

	getAuthenticateOptions() {
		return { session: false };
	}

	canActivate(context: ExecutionContext) {
		const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
		const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');

		if (!clientId || !clientSecret) {
			throw new ServiceUnavailableException('Google OAuth no está configurado');
		}

		return super.canActivate(context);
	}
}