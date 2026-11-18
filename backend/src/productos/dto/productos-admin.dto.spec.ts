import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CrearProductoDto } from './productos-admin.dto';

describe('CrearProductoDto multipart', () => {
  it('convierte la variante JSON de un formulario multipart en un DTO validable', () => {
    const dto = plainToInstance(CrearProductoDto, {
      codigoProducto: 'TSH001',
      idCategoria: '1',
      nombre: 'Polera UCN',
      costoAdquisicion: '1000',
      precioVenta: '2500',
      variante: JSON.stringify({
        talla: 'M',
        sku: 'TSH001-M',
        stock: '3',
        stockMinimo: '1',
      }),
    });

    expect(dto.variante.sku).toBe('TSH001-M');
    expect(validateSync(dto)).toHaveLength(0);
  });
});
