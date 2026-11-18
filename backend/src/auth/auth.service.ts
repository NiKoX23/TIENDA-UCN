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
import { DataSource, ILike, In, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Usuario } from './usuario.entity';
import { VendedorBiblioteca } from '../reservas/vendedor-biblioteca.entity';
import { HorarioVenta } from '../reservas/horario-venta.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ListarUsuariosQueryDto } from './dto/listar-usuarios.dto';
import { RolUsuario } from './dto/admin-rol.dto';
import {
  crearPagina,
  patronBusqueda,
  resolverPagina,
} from '../common/paginacion';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    @InjectRepository(VendedorBiblioteca)
    private vendedorRepository: Repository<VendedorBiblioteca>,
    private jwtService: JwtService,
    private config: ConfigService,
    private dataSource: DataSource,
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

  private aUsuarioPublico({
    uid,
    nombre,
    email,
    proveedorAuth,
    esAdmin,
    fechaRegistro,
  }: Usuario) {
    return { uid, nombre, email, proveedorAuth, esAdmin, fechaRegistro };
  }

  private async aUsuariosPublicos(usuarios: Usuario[]) {
    if (usuarios.length === 0) return [];

    const vendedores = await this.vendedorRepository.find({
      where: { usuario: { uid: In(usuarios.map(({ uid }) => uid)) } },
      relations: { usuario: true },
      select: { idVendedor: true, usuario: { uid: true } },
    });
    const uidsVendedores = new Set(
      vendedores.flatMap((vendedor) =>
        vendedor.usuario ? [vendedor.usuario.uid] : [],
      ),
    );

    return usuarios.map((usuario) => ({
      ...this.aUsuarioPublico(usuario),
      esVendedor: uidsVendedores.has(usuario.uid),
    }));
  }

  /**
   * Sin `page`: arreglo completo (comportamiento anterior).
   * Con `page`: { data, total, page, limit, totalPages }.
   */
  async listarUsuarios(query: ListarUsuariosQueryDto = {}) {
    if (query.page === undefined) {
      const usuarios = await this.usuarioRepository.find({
        order: { fechaRegistro: 'ASC' },
      });
      return this.aUsuariosPublicos(usuarios);
    }

    const { page, limit, offset } = resolverPagina(query);
    const patron = patronBusqueda(query.q);
    const consulta = this.usuarioRepository.createQueryBuilder('u');
    if (patron) {
      consulta.andWhere('(u.nombre ILIKE :patron OR u.email ILIKE :patron)', {
        patron,
      });
    }
    if (query.rol) {
      consulta.andWhere('u.esAdmin = :esAdmin', {
        esAdmin: query.rol === 'admin',
      });
    }
    const [usuarios, total] = await consulta
      .orderBy('u.fechaRegistro', 'ASC')
      .addOrderBy('u.uid', 'ASC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return crearPagina(
      await this.aUsuariosPublicos(usuarios),
      total,
      page,
      limit,
    );
  }

  async cambiarRolAdmin(uid: number, nuevoUid: number, role: RolUsuario) {
    if (uid === nuevoUid) {
      throw new ForbiddenException(
        'No puedes cambiar tu propio rol de administrador',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const usuarios = manager.getRepository(Usuario);
      const usuario = await usuarios.findOne({
        where: { uid: nuevoUid },
        lock: { mode: 'pessimistic_write' },
      });
      if (!usuario) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const esAdminConfigurado = this.obtenerEmailsAdmin().includes(
        this.normalizarEmail(usuario.email),
      );
      if (esAdminConfigurado && role !== 'admin') {
        throw new ForbiddenException(
          'No puedes quitar el rol del administrador configurado',
        );
      }

      const vendedores = manager.getRepository(VendedorBiblioteca);
      const vendedor = await vendedores.findOne({
        where: { usuario: { uid: usuario.uid } },
      });

      if (role === 'vendedor' && !vendedor) {
        await vendedores.save(
          vendedores.create({
            nombre: usuario.nombre.trim(),
            usuario,
            activo: true,
          }),
        );
      } else if (role !== 'vendedor' && vendedor) {
        await manager
          .getRepository(HorarioVenta)
          .delete({ idVendedor: vendedor.idVendedor });
        await vendedores.delete({ idVendedor: vendedor.idVendedor });
      }

      usuario.esAdmin = role === 'admin';
      await usuarios.save(usuario);

      return {
        uid: usuario.uid,
        role,
        esAdmin: usuario.esAdmin,
        esVendedor: role === 'vendedor',
      };
    });
  }

  async eliminarUsuarioAdmin(uid: number, usuarioUid: number) {
    if (uid === usuarioUid) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta');
    }

    const usuario = await this.usuarioRepository.findOne({
      where: { uid: usuarioUid },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (usuario.esAdmin) {
      const cantidadAdmins = await this.usuarioRepository.countBy({
        esAdmin: true,
      });
      if (cantidadAdmins <= 1) {
        throw new ForbiddenException(
          'No puedes eliminar al único administrador',
        );
      }
    }

    await this.usuarioRepository.manager.transaction(async (manager) => {
      // Conserva historial de clientes y alertas sin dejar referencias al usuario eliminado.
      await manager.query('UPDATE clientes SET uid = NULL WHERE uid = $1', [
        usuarioUid,
      ]);
      await manager.query(
        'UPDATE alertas_stock SET uid_resuelve = NULL WHERE uid_resuelve = $1',
        [usuarioUid],
      );
      await manager.delete(Usuario, { uid: usuarioUid });
    });

    return { uid: usuarioUid, eliminado: true };
  }

  private async generarToken(usuario: Usuario) {
    const esVendedor = Boolean(
      await this.vendedorRepository.findOne({
        where: { usuario: { uid: usuario.uid } },
        select: { idVendedor: true },
      }),
    );
    const payload = {
      sub: usuario.uid,
      email: usuario.email,
      nombre: usuario.nombre,
      esAdmin: usuario.esAdmin,
      esVendedor,
    };

    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        uid: usuario.uid,
        nombre: usuario.nombre,
        email: usuario.email,
        esAdmin: usuario.esAdmin,
        esVendedor,
      },
    };
  }

  private normalizarEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
