import { Controller, Post, Get, Put, Body, UseGuards, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

const COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: false,
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
};

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private config: ConfigService,
    ) {}

    @Post('register')
    async register(
        @Body() dto: RegisterDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { access_token, usuario } = await this.authService.register(dto);
        res.cookie('access_token', access_token, COOKIE_OPTIONS);
        return { usuario };
    }

    @Post('login')
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { access_token, usuario } = await this.authService.login(dto);
        res.cookie('access_token', access_token, COOKIE_OPTIONS);
        return { usuario };
    }

    @Post('logout')
    logout(@Res({ passthrough: true }) res: Response) {
        res.clearCookie('access_token', { path: '/' });
        return { mensaje: 'Sesión cerrada' };
    }

    @Get('perfil')
    @UseGuards(JwtAuthGuard)
    perfil(@Req() req) {
        return req.user;
    }

    @Put('perfil')
    @UseGuards(JwtAuthGuard)
    async actualizarPerfil(
        @Req() req,
        @Body() dto: UpdateProfileDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { access_token, usuario } = await this.authService.updateProfile(req.user.uid, dto);
        res.cookie('access_token', access_token, COOKIE_OPTIONS);
        return { usuario };
    }

    @Get('google')
    @UseGuards(GoogleAuthGuard)
    iniciarGoogle() {}

    @Get('google/callback')
    @UseGuards(GoogleAuthGuard)
    async callbackGoogle(@Req() req, @Res() res: Response) {
        const { access_token } = await this.authService.loginConGoogle(req.user);
        res.cookie('access_token', access_token, COOKIE_OPTIONS);
        const frontendUrl = this.config.get('FRONTEND_URL');
        res.redirect(frontendUrl);
    }
}