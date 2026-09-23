import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ILike, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Usuario } from './usuario.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.aplicarAdminsAutomaticos();
  }

  async register(dto: RegisterDto) {
    const email = this.normalizarEmail(dto.email);
    const existente = await this.usuarioRepository.findOne({
      where: { email: ILike(email) },
    });

    if (existente) {
      throw new ConflictException('Ese correo ya está registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const emailsAdmin = this.obtenerEmailsAdmin();

    const usuario = this.usuarioRepository.create({
      nombre: dto.nombre,
      email,
      passwordHash,
      esAdmin: emailsAdmin.includes(email),
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

  async updateProfile(uid: number, dto: UpdateProfileDto) {
    const usuario = await this.usuarioRepository.findOne({ where: { uid } });
    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const email = this.normalizarEmail(dto.email);
    const usuarioConEmail = await this.usuarioRepository.findOne({
      where: { email: ILike(email) },
    });
    if (usuarioConEmail && usuarioConEmail.uid !== uid) {
      throw new ConflictException('Ese correo ya está registrado');
    }

    usuario.nombre = dto.nombre.trim();
    usuario.email = email;
    if (dto.password) {
      usuario.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    await this.usuarioRepository.save(usuario);
    return this.generarToken(usuario);
  }

  async loginConGoogle(usuarioGoogle: {
    googleId: string;
    nombre: string;
    email: string;
  }) {
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
        esAdmin: this.obtenerEmailsAdmin().includes(email),
      });
      await this.usuarioRepository.save(usuario);
    } else if (!usuario.googleId) {
      usuario.googleId = usuarioGoogle.googleId;
      usuario.proveedorAuth = 'google';
      await this.usuarioRepository.save(usuario);
    }

    return this.generarToken(usuario);
  }

  private obtenerEmailsAdmin(): string[] {
    const raw = this.config.get<string>('ADMIN_EMAILS', '');
    return raw
      .split(',')
      .map((email) => this.normalizarEmail(email))
      .filter(Boolean);
  }

  private async aplicarAdminsAutomaticos() {
    const emails = this.obtenerEmailsAdmin();
    if (!emails.length) return;

    for (const email of emails) {
      const usuario = await this.usuarioRepository.findOne({
        where: { email: ILike(email) },
      });
      if (usuario && !usuario.esAdmin) {
        usuario.esAdmin = true;
        await this.usuarioRepository.save(usuario);
      }
    }
  }

  async listarUsuarios() {
    const usuarios = await this.usuarioRepository.find({
      order: { fechaRegistro: 'ASC' },
    });
    return usuarios.map(
      ({ uid, nombre, email, proveedorAuth, esAdmin, fechaRegistro }) => ({
        uid,
        nombre,
        email,
        proveedorAuth,
        esAdmin,
        fechaRegistro,
      }),
    );
  }

  async cambiarRolAdmin(uid: number, nuevoUid: number, esAdmin: boolean) {
    if (uid === nuevoUid) {
      throw new ForbiddenException(
        'No puedes cambiar tu propio rol de administrador',
      );
    }

    const usuario = await this.usuarioRepository.findOne({
      where: { uid: nuevoUid },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    usuario.esAdmin = esAdmin;
    await this.usuarioRepository.save(usuario);

    return { uid: usuario.uid, esAdmin: usuario.esAdmin };
  }

  private generarToken(usuario: Usuario) {
    const payload = {
      sub: usuario.uid,
      email: usuario.email,
      nombre: usuario.nombre,
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
