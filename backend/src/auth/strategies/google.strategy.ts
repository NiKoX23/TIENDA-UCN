import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(config: ConfigService) {
        super({
            clientID: config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
            clientSecret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
            callbackURL: config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
            scope: ['email', 'profile'],
        });
    }

    validate(
        accessToken: string,
        refreshToken: string,
        profile: Profile,
    ) {
        const email = profile.emails?.[0]?.value;

        if (!email) {
            throw new UnauthorizedException('No se pudo obtener el correo electrónico del perfil de Google');
        }

        return {
            googleId: profile.id,
            nombre: profile.displayName,
            email,
        };
    }
}
