import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../usuario.entity';
import { VendedorBiblioteca } from '../../reservas/vendedor-biblioteca.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    @InjectRepository(Usuario) private usuarioRepository: Repository<Usuario>,
    @InjectRepository(VendedorBiblioteca)
    private vendedorRepository: Repository<VendedorBiblioteca>,
  ) {
    super({
      jwtFromRequest: (req: Request) => {
        if (typeof req?.cookies?.access_token === 'string') {
          return req.cookies.access_token;
        }
        const authorization = req?.headers?.authorization;
        return authorization?.toLowerCase().startsWith('bearer ')
          ? authorization.slice(7).trim()
          : null;
      },
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: {
    sub: number;
    email: string;
    nombre?: string;
    esAdmin: boolean;
  }) {
    const usuario = await this.usuarioRepository.findOne({
      where: { uid: payload.sub },
    });
    if (!usuario) return null;
    const esVendedor = Boolean(
      await this.vendedorRepository.findOne({
        where: { usuario: { uid: usuario.uid } },
        select: { idVendedor: true },
      }),
    );

    return {
      uid: usuario.uid,
      nombre: usuario.nombre,
      email: usuario.email,
      esAdmin:
        usuario.esAdmin ||
        this.obtenerEmailsAdmin().includes(usuario.email.trim().toLowerCase()),
      esVendedor,
    };
  }

  private obtenerEmailsAdmin(): string[] {
    return (this.config.get<string>('ADMIN_EMAILS', '') ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
  }
}
