import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ArchivosService } from '../common/archivos.service';
import { VentasService } from './ventas.service';

describe('VentasService', () => {
  it('exige un vendedor responsable al registrar una venta normal', async () => {
    const vendedorRepository = { findOne: jest.fn().mockResolvedValue(null) };
    const manager = {
      getRepository: jest.fn().mockReturnValue(vendedorRepository),
    };
    const dataSource = {
      transaction: jest.fn(
        (operation: (transactionManager: typeof manager) => Promise<unknown>) =>
          operation(manager),
      ),
    } as unknown as DataSource;
    const service = new VentasService(dataSource, {} as ArchivosService);

    await expect(
      service.registrarVenta({
        sku: 'POL-TN-S',
        cantidad: 1,
        metodoPago: 'efectivo',
        tipoVenta: 'normal',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.getRepository).not.toHaveBeenCalled();
  });
});
