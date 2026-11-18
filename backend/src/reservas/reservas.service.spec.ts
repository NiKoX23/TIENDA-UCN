import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EstadoReserva } from './estado-reserva.enum';
import { Reserva } from './reserva.entity';
import { ReservasService } from './reservas.service';

function crearContextoCambioVendedor(estado: EstadoReserva) {
  const reserva = {
    idReserva: 16,
    codigoReserva: 'RES-16',
    uid: 27,
    usuario: {
      uid: 27,
      nombre: 'Cliente',
      email: 'cliente@example.com',
      passwordHash: null,
      googleId: null,
      proveedorAuth: 'local',
      esAdmin: false,
      fechaRegistro: new Date('2026-01-01T00:00:00Z'),
    },
    fechaRetiro: '2099-01-02',
    idHorario: null,
    horarioVenta: null,
    bloqueHorario: null,
    observaciones: null,
    estado,
    total: 0,
    fechaCreacion: new Date('2026-01-01T00:00:00Z'),
    fechaActualizacion: new Date('2026-01-01T00:00:00Z'),
    items: [],
  } as Reserva;
  const queryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(reserva),
  };
  const repository = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    findOne: jest.fn().mockResolvedValue(reserva),
    save: jest.fn((actualizada: Reserva) => Promise.resolve(actualizada)),
  };
  const manager = { getRepository: jest.fn().mockReturnValue(repository) };
  const dataSource = {
    transaction: jest.fn(
      (operation: (transactionManager: typeof manager) => Promise<unknown>) =>
        operation(manager),
    ),
    getRepository: jest.fn().mockReturnValue(repository),
  } as unknown as DataSource;

  return {
    service: new ReservasService(dataSource),
    queryBuilder,
    repository,
  };
}

describe('ReservasService para vendedores', () => {
  it('solo lista reservas vinculadas a horarios del usuario vendedor', async () => {
    const repository = { find: jest.fn().mockResolvedValue([]) };
    const dataSource = {
      getRepository: jest.fn().mockReturnValue(repository),
    } as unknown as DataSource;
    const service = new ReservasService(dataSource);

    await service.listarParaVendedor(27);

    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { horarioVenta: { vendedor: { usuario: { uid: 27 } } } },
      }),
    );
  });

  it('permite marcar directamente como entregada una reserva pendiente', async () => {
    const { service, queryBuilder, repository } = crearContextoCambioVendedor(
      EstadoReserva.PENDIENTE,
    );

    await expect(
      service.actualizarEstadoVendedor(27, 16, EstadoReserva.RETIRADA),
    ).resolves.toMatchObject({ estado: EstadoReserva.RETIRADA });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith('vendedor.uid = :uid', {
      uid: 27,
    });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ estado: EstadoReserva.RETIRADA }),
    );
  });

  it('permite deshacer la entrega al estado pendiente', async () => {
    const { service, repository } = crearContextoCambioVendedor(
      EstadoReserva.RETIRADA,
    );

    await expect(
      service.actualizarEstadoVendedor(27, 16, EstadoReserva.PENDIENTE),
    ).resolves.toMatchObject({ estado: EstadoReserva.PENDIENTE });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ estado: EstadoReserva.PENDIENTE }),
    );
  });

  it('no encuentra una reserva que no pertenece a los horarios del vendedor', async () => {
    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const manager = { getRepository: jest.fn().mockReturnValue(repository) };
    const dataSource = {
      transaction: jest.fn(
        (operation: (transactionManager: typeof manager) => Promise<unknown>) =>
          operation(manager),
      ),
    } as unknown as DataSource;
    const service = new ReservasService(dataSource);

    await expect(
      service.actualizarEstadoVendedor(27, 99, EstadoReserva.LISTA_PARA_RETIRO),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
