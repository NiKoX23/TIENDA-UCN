import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { VendedorBiblioteca } from '../../reservas/vendedor-biblioteca.entity';
import { Usuario } from '../usuario.entity';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('autoriza como admin al correo incluido en ADMIN_EMAILS', async () => {
    const usuario = {
      uid: 7,
      nombre: 'Admin de entorno',
      email: 'admin@example.com',
      esAdmin: false,
    } as Usuario;
    const usuarioRepository = {
      findOne: jest.fn(() => Promise.resolve(usuario)),
    };
    const vendedorRepository = {
      findOne: jest.fn(() => Promise.resolve(null)),
    };
    const config = {
      getOrThrow: jest.fn(() => 'jwt-secret'),
      get: jest.fn(() => ' ADMIN@example.com '),
    } as unknown as ConfigService;
    const strategy = new JwtStrategy(
      config,
      usuarioRepository as unknown as Repository<Usuario>,
      vendedorRepository as unknown as Repository<VendedorBiblioteca>,
    );

    await expect(
      strategy.validate({
        sub: usuario.uid,
        email: usuario.email,
        esAdmin: false,
      }),
    ).resolves.toMatchObject({ uid: usuario.uid, esAdmin: true });
  });
});
