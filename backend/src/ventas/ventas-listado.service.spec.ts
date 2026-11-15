import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { VentasListadoService } from './ventas-listado.service';

describe('VentasListadoService para vendedores', () => {
  it('filtra las facturas por vendedor y rango de fechas', async () => {
    const vendedorRepository = {
      findOne: jest.fn().mockResolvedValue({ idVendedor: 12 }),
    };
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([]);
    const dataSource = {
      getRepository: jest.fn().mockReturnValue(vendedorRepository),
      query: queryMock,
    } as unknown as DataSource;
    const service = new VentasListadoService(dataSource);

    const pagina = await service.listarBoletasVendedor(27, {
      page: 1,
      limit: 10,
      desde: '2026-01-01',
      hasta: '2026-01-31',
      tipo: 'normal',
    });

    expect(vendedorRepository.findOne).toHaveBeenCalledWith({
      where: { usuario: { uid: 27 } },
      select: { idVendedor: true },
    });
    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('f.id_vendedor = $5::integer'),
      ['normal', null, '2026-01-01', '2026-01-31', 12],
    );
    expect(pagina).toMatchObject({ data: [], total: 0, page: 1, limit: 10 });
  });

  it('rechaza un rango de fechas invertido', async () => {
    const vendedorRepository = {
      findOne: jest.fn().mockResolvedValue({ idVendedor: 12 }),
    };
    const queryMock = jest.fn();
    const dataSource = {
      getRepository: jest.fn().mockReturnValue(vendedorRepository),
      query: queryMock,
    } as unknown as DataSource;
    const service = new VentasListadoService(dataSource);

    await expect(
      service.listarBoletasVendedor(27, {
        desde: '2026-02-01',
        hasta: '2026-01-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(queryMock).not.toHaveBeenCalled();
  });
});
