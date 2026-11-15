import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EstadoReserva } from './estado-reserva.enum';
import { ReservasService } from './reservas.service';

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

  it('rechaza marcar como retirada una reserva que aún está pendiente', async () => {
    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        idReserva: 16,
        estado: EstadoReserva.PENDIENTE,
      }),
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      save: jest.fn(),
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
      service.actualizarEstadoVendedor(27, 16, EstadoReserva.RETIRADA),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(queryBuilder.andWhere).toHaveBeenCalledWith('vendedor.uid = :uid', {
      uid: 27,
    });
    expect(repository.save).not.toHaveBeenCalled();
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
