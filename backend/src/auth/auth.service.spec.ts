import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { HorarioVenta } from '../reservas/horario-venta.entity';
import { VendedorBiblioteca } from '../reservas/vendedor-biblioteca.entity';
import { Usuario } from './usuario.entity';
import { AuthService } from './auth.service';

function crearServicio(
  usuario: Usuario,
  vendedor: VendedorBiblioteca | null,
  adminsConfigurados = '',
) {
  const usuarioRepository = {
    findOne: jest.fn(() => Promise.resolve(usuario)),
    save: jest.fn((valor: Usuario) => Promise.resolve(valor)),
  };
  const vendedorRepository = {
    findOne: jest.fn(() => Promise.resolve(vendedor)),
    create: jest.fn(
      (valor: Partial<VendedorBiblioteca>) => valor as VendedorBiblioteca,
    ),
    save: jest.fn((valor: VendedorBiblioteca) => Promise.resolve(valor)),
    delete: jest.fn(() => Promise.resolve({ affected: 1 })),
  };
  const horarioRepository = {
    delete: jest.fn(() => Promise.resolve({ affected: 2 })),
  };
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Usuario) return usuarioRepository;
      if (entity === VendedorBiblioteca) return vendedorRepository;
      if (entity === HorarioVenta) return horarioRepository;
      throw new Error('Repositorio inesperado');
    }),
  };
  const transaction = jest.fn(
    (operation: (transactionManager: typeof manager) => Promise<unknown>) =>
      operation(manager),
  );
  const dataSource = {
    transaction,
  } as unknown as DataSource;
  const config = {
    get: jest.fn(
      (_key: string, fallback: string) => adminsConfigurados || fallback,
    ),
  } as unknown as ConfigService;
  const service = new AuthService(
    usuarioRepository as unknown as Repository<Usuario>,
    vendedorRepository as unknown as Repository<VendedorBiblioteca>,
    {} as JwtService,
    config,
    dataSource,
  );

  return {
    service,
    usuarioRepository,
    vendedorRepository,
    horarioRepository,
    manager,
    dataSource,
    transaction,
  };
}

describe('AuthService cambiarRolAdmin', () => {
  const usuarioBase = (): Usuario =>
    ({
      uid: 10,
      nombre: 'Usuario de prueba',
      email: 'usuario@example.com',
      esAdmin: false,
    }) as Usuario;

  it('asigna vendedor y quita el rol administrador en una operación', async () => {
    const usuario = { ...usuarioBase(), esAdmin: true };
    const { service, vendedorRepository, usuarioRepository } = crearServicio(
      usuario,
      null,
    );

    await expect(
      service.cambiarRolAdmin(1, usuario.uid, 'vendedor'),
    ).resolves.toMatchObject({
      uid: usuario.uid,
      role: 'vendedor',
      esAdmin: false,
      esVendedor: true,
    });

    expect(vendedorRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: usuario.nombre, usuario }),
    );
    expect(usuarioRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ esAdmin: false }),
    );
  });

  it('quita el rol vendedor y sus horarios al cambiar a usuario', async () => {
    const usuario = usuarioBase();
    const vendedor = {
      idVendedor: 22,
      usuario,
    } as VendedorBiblioteca;
    const { service, vendedorRepository, horarioRepository } = crearServicio(
      usuario,
      vendedor,
    );

    await expect(
      service.cambiarRolAdmin(1, usuario.uid, 'usuario'),
    ).resolves.toMatchObject({
      uid: usuario.uid,
      role: 'usuario',
      esAdmin: false,
      esVendedor: false,
    });

    expect(horarioRepository.delete).toHaveBeenCalledWith({ idVendedor: 22 });
    expect(vendedorRepository.delete).toHaveBeenCalledWith({
      idVendedor: 22,
    });
  });

  it('impide quitar el rol al correo configurado como administrador', async () => {
    const usuario = { ...usuarioBase(), email: ' ADMIN@example.com ' };
    const { service, transaction, usuarioRepository } = crearServicio(
      usuario,
      null,
      'admin@example.com',
    );

    await expect(
      service.cambiarRolAdmin(1, usuario.uid, 'usuario'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(transaction.mock.calls).toHaveLength(1);
    expect(usuarioRepository.save).not.toHaveBeenCalled();
  });
});
