import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Usuario } from '../auth/usuario.entity';
import { Cliente } from '../clientes/cliente.entity';
import { VarianteProducto } from '../productos/variante-producto.entity';
import { CrearCompraDto } from './facturacion.dto';
import { Factura } from './factura.entity';
import { Salida } from './salida.entity';

@Injectable()
export class FacturacionService {
  constructor(private readonly dataSource: DataSource) {}

  async crearCompra(uid: number, dto: CrearCompraDto) {
    if (!dto.lineas?.length)
      throw new BadRequestException('El carrito está vacío');

    const cantidades = new Map<string, number>();
    for (const linea of dto.lineas) {
      cantidades.set(
        linea.codigoProducto,
        (cantidades.get(linea.codigoProducto) ?? 0) + linea.cantidad,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const usuario = await manager.getRepository(Usuario).findOneBy({ uid });
      if (!usuario) throw new NotFoundException('Usuario no encontrado');

      const clienteRepository = manager.getRepository(Cliente);
      let cliente = await clienteRepository.findOneBy({ uid });
      if (cliente) {
        cliente.nombre = usuario.nombre;
        cliente.email = usuario.email;
      } else {
        cliente = clienteRepository.create({
          uid,
          nombre: usuario.nombre,
          email: usuario.email,
        });
      }
      cliente = await clienteRepository.save(cliente);

      const varianteRepository = manager.getRepository(VarianteProducto);
      const detalles: Array<{
        idVariante: number;
        cantidad: number;
        precio: number;
        subtotal: number;
      }> = [];
      for (const [codigoProducto, cantidad] of cantidades) {
        const variante = await varianteRepository.findOne({
          where: { producto: { codigoProducto } },
          relations: { producto: true },
          lock: { mode: 'pessimistic_write' },
        });
        if (!variante || !variante.producto.activo)
          throw new NotFoundException(
            `Producto no encontrado: ${codigoProducto}`,
          );
        if (variante.stock < cantidad)
          throw new BadRequestException(
            `Stock insuficiente para ${codigoProducto}`,
          );
        detalles.push({
          idVariante: variante.idVariante,
          cantidad,
          precio: variante.producto.precioVenta,
          subtotal: variante.producto.precioVenta * cantidad,
        });
      }

      const total = detalles.reduce(
        (suma, detalle) => suma + detalle.subtotal,
        0,
      );
      const numeroDocumento = `B-${Date.now()}-${uid}`;
      const facturaRepository = manager.getRepository(Factura);
      const factura = await facturaRepository.save(
        facturaRepository.create({
          cliente,
          tipoDocumento: 'boleta',
          numeroDocumento,
          metodoPago: dto.metodoPago,
          total,
        }),
      );

      const salidaRepository = manager.getRepository(Salida);
      for (const detalle of detalles) {
        const variante = await varianteRepository.findOneByOrFail({
          idVariante: detalle.idVariante,
        });
        await salidaRepository.save(
          salidaRepository.create({
            factura,
            variante,
            cantidad: detalle.cantidad,
            precioUnitario: detalle.precio,
            subtotal: detalle.subtotal,
          }),
        );
        variante.stock -= detalle.cantidad;
        await varianteRepository.save(variante);
      }

      return { idFactura: factura.idFactura, numeroDocumento, total };
    });
  }
}
