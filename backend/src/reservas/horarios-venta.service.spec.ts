import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HorariosVentaService } from './horarios-venta.service';
import { VendedorBiblioteca } from './vendedor-biblioteca.entity';

describe('HorariosVentaService', () => {
  it('rechaza un horario que se cruza con el de otro vendedor', async () => {
    const fecha = '2099-01-02';
    const vendedorRepository = {
      findOne: jest.fn().mockResolvedValue({
        idVendedor: 2,
        nombre: 'Nuevo vendedor',
        activo: true,
        usuario: { nombre: 'Nuevo vendedor' },
      }),
    };
    const horarioRepository = {
      find: jest.fn().mockResolvedValue([
        {
          idHorario: 10,
          idVendedor: 1,
          fecha,
          horaInicio: '12:00:00',
          horaTermino: '17:00:00',
          activo: true,
        },
      ]),
      save: jest.fn(),
    };
    const manager = {
      query: jest.fn().mockResolvedValue([]),
      getRepository: jest.fn((entity: unknown) =>
        entity === VendedorBiblioteca ? vendedorRepository : horarioRepository,
      ),
    };
    const dataSource = {
      transaction: jest.fn(
        (operation: (transactionManager: typeof manager) => Promise<unknown>) =>
          operation(manager),
      ),
    } as unknown as DataSource;
    const service = new HorariosVentaService(dataSource);

    await expect(
      service.crearHorario({
        idVendedor: 2,
        fecha,
        horaInicio: '16:00',
        horaTermino: '18:00',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(horarioRepository.find).toHaveBeenCalledWith({
      where: { fecha, activo: true },
    });
    expect(horarioRepository.save).not.toHaveBeenCalled();
    expect(manager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock($1, $2)',
      [0x55434e48, 20990102],
    );
  });

  it('permite asignar turnos consecutivos sin solapamiento', async () => {
    const fecha = '2099-01-02';
    const vendedorRepository = {
      findOne: jest.fn().mockResolvedValue({
        idVendedor: 2,
        nombre: 'Nuevo vendedor',
        activo: true,
        usuario: { nombre: 'Nuevo vendedor' },
      }),
    };
    const horarioRepository = {
      find: jest.fn().mockResolvedValue([
        {
          idHorario: 10,
          idVendedor: 1,
          fecha,
          horaInicio: '12:00:00',
          horaTermino: '17:00:00',
          activo: true,
        },
      ]),
      create: jest.fn((horario: object) => horario),
      save: jest.fn().mockResolvedValue({
        idHorario: 11,
        idVendedor: 2,
        fecha,
        horaInicio: '17:00',
        horaTermino: '18:00',
        activo: true,
      }),
    };
    const manager = {
      query: jest.fn().mockResolvedValue([]),
      getRepository: jest.fn((entity: unknown) =>
        entity === VendedorBiblioteca ? vendedorRepository : horarioRepository,
      ),
    };
    const dataSource = {
      transaction: jest.fn(
        (operation: (transactionManager: typeof manager) => Promise<unknown>) =>
          operation(manager),
      ),
    } as unknown as DataSource;
    const service = new HorariosVentaService(dataSource);

    await expect(
      service.crearHorario({
        idVendedor: 2,
        fecha,
        horaInicio: '17:00',
        horaTermino: '18:00',
      }),
    ).resolves.toMatchObject({
      idHorario: 11,
      idVendedor: 2,
      horaInicio: '17:00',
      horaTermino: '18:00',
    });

    expect(horarioRepository.save).toHaveBeenCalled();
  });

  it('no reactiva un turno que se cruza con el de otro vendedor', async () => {
    const fecha = '2099-01-02';
    const horarioInactivo = {
      idHorario: 11,
      idVendedor: 2,
      fecha,
      horaInicio: '13:00:00',
      horaTermino: '14:30:00',
      activo: false,
    };
    const vendedorRepository = {
      findOne: jest.fn().mockResolvedValue({
        idVendedor: 2,
        nombre: 'Nuevo vendedor',
        activo: true,
        usuario: { nombre: 'Nuevo vendedor' },
      }),
    };
    const horarioRepository = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(horarioInactivo)
        .mockResolvedValueOnce({
          ...horarioInactivo,
          vendedor: { nombre: 'Nuevo vendedor', activo: true },
        }),
      find: jest.fn().mockResolvedValue([
        {
          idHorario: 10,
          idVendedor: 1,
          fecha,
          horaInicio: '12:00:00',
          horaTermino: '17:00:00',
          activo: true,
        },
      ]),
      save: jest.fn(),
    };
    const manager = {
      query: jest.fn().mockResolvedValue([]),
      getRepository: jest.fn((entity: unknown) =>
        entity === VendedorBiblioteca ? vendedorRepository : horarioRepository,
      ),
    };
    const dataSource = {
      transaction: jest.fn(
        (operation: (transactionManager: typeof manager) => Promise<unknown>) =>
          operation(manager),
      ),
    } as unknown as DataSource;
    const service = new HorariosVentaService(dataSource);

    await expect(
      service.cambiarDisponibilidad(11, true),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(horarioRepository.save).not.toHaveBeenCalled();
    expect(manager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock($1, $2)',
      [0x55434e48, 20990102],
    );
  });
});
