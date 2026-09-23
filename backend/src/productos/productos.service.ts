import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from './producto.entity';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
  ) {}

  async listar() {
    const productos = await this.productoRepository.find({
      where: { activo: true },
      relations: { categoria: true, variantes: true },
      order: { nombre: 'ASC' },
    });

    return productos.flatMap((producto) =>
      producto.variantes.map((variante) => ({
        codigoProducto: producto.codigoProducto,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        categoria: producto.categoria.nombre,
        precio: producto.precioVenta,
        precioTac: producto.precioTac,
        imagen: producto.imagenUrl,
        idVariante: variante.idVariante,
        talla: variante.talla,
        color: variante.color,
        sku: variante.sku,
        stock: variante.stock,
      })),
    );
  }
}
