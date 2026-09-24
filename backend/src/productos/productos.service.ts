import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from './categoria.entity';
import { Producto } from './producto.entity';
import { VarianteProducto } from './variante-producto.entity';
import {
  ActualizarProductoDto,
  CrearProductoDto,
  VarianteDto,
} from './dto/productos-admin.dto';

export interface ItemInventario {
  codigoProducto: string;
  nombre: string;
  marca: string | null;
  categoria: string;
  talla: string;
  color: string | null;
  sku: string;
  activo: boolean;
  costoAdquisicion: number;
  precioVenta: number;
  precioTac: number;
  stock: number;
  stockMinimo: number;
  vendidas: number;
  inicial: number;
  margen: number;
  ingresoVenta: number;
  ingresoTac: number;
  estado: 'CRITICO' | 'BAJO' | 'NORMAL' | 'ALTO';
}

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly productoRepository: Repository<Producto>,
    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,
    @InjectRepository(VarianteProducto)
    private readonly varianteRepository: Repository<VarianteProducto>,
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

  async listarCategorias(): Promise<{ idCategoria: number; nombre: string }[]> {
    const categorias = await this.categoriaRepository.find({
      order: { nombre: 'ASC' },
    });
    return categorias.map((categoria) => ({
      idCategoria: categoria.idCategoria,
      nombre: categoria.nombre,
    }));
  }

  async listarInventario(): Promise<ItemInventario[]> {
    const ventasPorVariante: Array<{ id_variante: string; vendidas: string }> =
      await this.productoRepository.manager.query(
        'SELECT id_variante, COALESCE(SUM(cantidad), 0)::int AS vendidas FROM salidas GROUP BY id_variante',
      );
    const vendidasPorVariante = new Map<number, number>(
      ventasPorVariante.map((fila) => [
        Number(fila.id_variante),
        Number(fila.vendidas),
      ]),
    );

    const productos = await this.productoRepository.find({
      relations: { categoria: true, variantes: true },
      order: { nombre: 'ASC' },
    });

    const items: ItemInventario[] = [];
    for (const producto of productos) {
      for (const variante of producto.variantes) {
        const vendidas = vendidasPorVariante.get(variante.idVariante) ?? 0;
        const precioTac = producto.precioTac ?? 0;
        const stock = variante.stock;
        const inicial = stock + vendidas;
        const margen = producto.precioVenta - precioTac;
        const estado: ItemInventario['estado'] =
          stock <= 5
            ? 'CRITICO'
            : stock <= 20
              ? 'BAJO'
              : stock <= 50
                ? 'NORMAL'
                : 'ALTO';

        items.push({
          codigoProducto: producto.codigoProducto,
          nombre: producto.nombre,
          marca: producto.marca,
          categoria: producto.categoria.nombre,
          talla: variante.talla,
          color: variante.color,
          sku: variante.sku,
          activo: producto.activo,
          costoAdquisicion: producto.costoAdquisicion,
          precioVenta: producto.precioVenta,
          precioTac,
          stock,
          stockMinimo: variante.stockMinimo,
          vendidas,
          inicial,
          margen,
          ingresoVenta: vendidas * producto.precioVenta,
          ingresoTac: vendidas * precioTac,
          estado,
        });
      }
    }

    return items;
  }

  async ajustarStock(sku: string, stock: number) {
    const variante = await this.varianteRepository.findOne({ where: { sku } });
    if (!variante) {
      throw new NotFoundException(`Variante con SKU ${sku} no encontrada`);
    }

    variante.stock = stock;
    const guardada = await this.varianteRepository.save(variante);
    return {
      idVariante: guardada.idVariante,
      sku: guardada.sku,
      stock: guardada.stock,
    };
  }

  async crearProducto(dto: CrearProductoDto) {
    const codigoProducto = dto.codigoProducto.trim().toUpperCase();

    const existente = await this.productoRepository.findOne({
      where: { codigoProducto },
    });
    if (existente) {
      throw new ConflictException(
        `Ya existe un producto con código ${codigoProducto}`,
      );
    }

    const categoria = await this.categoriaRepository.findOne({
      where: { idCategoria: dto.idCategoria },
    });
    if (!categoria) {
      throw new BadRequestException('Categoría no válida');
    }

    const sku = dto.variante.sku.trim().toUpperCase();
    const varianteExistente = await this.varianteRepository.findOne({
      where: { sku },
    });
    if (varianteExistente) {
      throw new ConflictException(`Ya existe una variante con SKU ${sku}`);
    }

    const producto = await this.productoRepository.save(
      this.productoRepository.create({
        codigoProducto,
        categoria,
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim() || null,
        marca: dto.marca?.trim() || null,
        costoAdquisicion: dto.costoAdquisicion,
        precioVenta: dto.precioVenta,
        precioTac: dto.precioTac ?? null,
        imagenUrl: dto.imagenUrl?.trim() || null,
        activo: dto.activo ?? true,
      }),
    );

    await this.varianteRepository.save(
      this.varianteRepository.create({
        producto,
        talla: dto.variante.talla.trim() || 'unica',
        color: dto.variante.color?.trim() || null,
        sku,
        stock: dto.variante.stock,
        stockMinimo: dto.variante.stockMinimo,
      }),
    );

    return { codigoProducto: producto.codigoProducto, nombre: producto.nombre };
  }

  async actualizarProducto(codigoProducto: string, dto: ActualizarProductoDto) {
    const producto = await this.productoRepository.findOne({
      where: { codigoProducto },
      relations: { categoria: true },
    });
    if (!producto) {
      throw new NotFoundException(`Producto ${codigoProducto} no encontrado`);
    }

    if (dto.idCategoria !== undefined) {
      const categoria = await this.categoriaRepository.findOne({
        where: { idCategoria: dto.idCategoria },
      });
      if (!categoria) {
        throw new BadRequestException('Categoría no válida');
      }
      producto.categoria = categoria;
    }
    if (dto.nombre !== undefined) producto.nombre = dto.nombre.trim();
    if (dto.descripcion !== undefined)
      producto.descripcion = dto.descripcion.trim() || null;
    if (dto.marca !== undefined) producto.marca = dto.marca.trim() || null;
    if (dto.costoAdquisicion !== undefined)
      producto.costoAdquisicion = dto.costoAdquisicion;
    if (dto.precioVenta !== undefined) producto.precioVenta = dto.precioVenta;
    if (dto.precioTac !== undefined) producto.precioTac = dto.precioTac;
    if (dto.imagenUrl !== undefined)
      producto.imagenUrl = dto.imagenUrl.trim() || null;
    if (dto.activo !== undefined) producto.activo = dto.activo;

    const guardado = await this.productoRepository.save(producto);
    return {
      codigoProducto: guardado.codigoProducto,
      nombre: guardado.nombre,
      activo: guardado.activo,
    };
  }

  async agregarVariante(codigoProducto: string, dto: VarianteDto) {
    const producto = await this.productoRepository.findOne({
      where: { codigoProducto },
    });
    if (!producto) {
      throw new NotFoundException(`Producto ${codigoProducto} no encontrado`);
    }

    const sku = dto.sku.trim().toUpperCase();
    const varianteExistente = await this.varianteRepository.findOne({
      where: { sku },
    });
    if (varianteExistente) {
      throw new ConflictException(`Ya existe una variante con SKU ${sku}`);
    }

    const variante = await this.varianteRepository.save(
      this.varianteRepository.create({
        producto,
        talla: dto.talla.trim() || 'unica',
        color: dto.color?.trim() || null,
        sku,
        stock: dto.stock,
        stockMinimo: dto.stockMinimo,
      }),
    );

    return {
      idVariante: variante.idVariante,
      sku: variante.sku,
      stock: variante.stock,
    };
  }
}
