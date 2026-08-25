import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Usuario } from './usuario.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(Usuario)
        private usuarioRepository: Repository<Usuario>,
        private jwtService: JwtService,
    ) {}

    async register(dto: RegisterDto) {
        const email = this.normalizarEmail(dto.email);
        const existente = await this.usuarioRepository.findOne({
            where: { email: ILike(email) },
        });

        if (existente) {
            throw new ConflictException('Ese correo ya está registrado');
        }

        const passwordHash = await bcrypt.hash(dto.password, 10);

        const usuario = this.usuarioRepository.create({
            nombre: dto.nombre,
            email,
            passwordHash,
            esAdmin: false,
        });

        await this.usuarioRepository.save(usuario);
        return this.generarToken(usuario);
    }

    async login(dto: LoginDto) {
        const usuario = await this.usuarioRepository.findOne({
            where: { email: ILike(this.normalizarEmail(dto.email)) },
        });

        if (!usuario) {
            throw new UnauthorizedException('Correo o contraseña incorrectos');
        }

        const coincide = usuario.passwordHash
            ? await bcrypt.compare(dto.password, usuario.passwordHash)
            : false;

        if (!coincide) {
            throw new UnauthorizedException('Correo o contraseña incorrectos');
        }

        return this.generarToken(usuario);
    }

    async loginConGoogle(usuarioGoogle: {googleId: string; nombre: string; email: string;}) {
        const email = this.normalizarEmail(usuarioGoogle.email);
        let usuario = await this.usuarioRepository.findOne({
            where: { googleId: usuarioGoogle.googleId },
        });

        if (!usuario) {
            usuario = await this.usuarioRepository.findOne({
                where: { email: ILike(email) },
            });
        }

        if (!usuario) {
            usuario = this.usuarioRepository.create({
                nombre: usuarioGoogle.nombre,
                email,
                googleId: usuarioGoogle.googleId,
                proveedorAuth: 'google',
                passwordHash: null,
                esAdmin: false,
            });
            await this.usuarioRepository.save(usuario);

        } else if (!usuario.googleId) {
            usuario.googleId = usuarioGoogle.googleId;
            usuario.proveedorAuth = 'google';
            await this.usuarioRepository.save(usuario);
        }

        return this.generarToken(usuario);
    }

    private generarToken(usuario: Usuario) {
        const payload = {
            sub: usuario.uid,
            email: usuario.email,
            esAdmin: usuario.esAdmin,
        };

        return {
            access_token: this.jwtService.sign(payload),
            usuario: {
                uid: usuario.uid,
                nombre: usuario.nombre,
                email: usuario.email,
                esAdmin: usuario.esAdmin,
            },
        };
    }

    private normalizarEmail(email: string): string {
        return email.trim().toLowerCase();
    }
}