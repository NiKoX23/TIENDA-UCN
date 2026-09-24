import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Cliente } from '../clientes/cliente.entity';
import { Factura } from '../facturacion/factura.entity';
import { Salida } from '../facturacion/salida.entity';
import { VarianteProducto } from '../productos/variante-producto.entity';
import { DocumentoTac } from './documento-tac.entity';
import { FirmasDto, RegistrarVentaDto } from './ventas.dto';

function generarFolio(prefijo: string): string {
  const hora = Date.now().toString(36).toUpperCase();
  const azar = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefijo}-${hora}${azar}`;
}

function estadoTac(
  comprador: string,
  vendedor: string,
): 'Aprobado' | 'Pendiente' | 'Rechazado' {
  if (comprador === 'Firmado' && vendedor === 'Firmado') return 'Aprobado';
  if (comprador === 'Rechazado' || vendedor === 'Rechazado') return 'Rechazado';
  return 'Pendiente';
}

const EMAIL_CLIENTE_RESPALDO = 'respaldo-admin@tienda.local';

@Injectable()
export class VentasService {
  constructor(private readonly dataSource: DataSource) {}

  async listarRegistroVentas() {
    const salidas = await this.dataSource
      .getRepository(Salida)
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.factura', 'f')
      .leftJoinAndSelect('f.documento', 'd')
      .innerJoinAndSelect('s.variante', 'v')
      .innerJoinAndSelect('v.producto', 'p')
      .orderBy('f.fecha', 'DESC')
      .addOrderBy('f.id_factura', 'DESC')
      .getMany();

    return salidas.map((s) => {
      const factura = s.factura;
      const documento = factura.documento ?? null;
      const esTac = factura.tipoVenta === 'tac';
      const precioTac = s.variante.producto.precioTac ?? 0;
      const gananciaUnitaria = esTac ? 0 : s.precioUnitario - precioTac;

      let tacAprobado: 'Si' | 'Pendiente' | 'No' | null = null;
      if (esTac && documento) {
        tacAprobado =
          documento.firmaComprador === 'Firmado' &&
          documento.firmaVendedor === 'Firmado'
            ? 'Si'
            : documento.firmaComprador === 'Rechazado' ||
                documento.firmaVendedor === 'Rechazado'
              ? 'No'
              : 'Pendiente';
      }

      return {
        idSalida: s.idSalida,
        idFactura: factura.idFactura,
        numeroDocumento: factura.numeroDocumento,
        fecha: factura.fecha,
        producto: s.variante.producto.nombre,
        codigoProducto: s.variante.producto.codigoProducto,
        sku: s.variante.sku,
        talla: s.variante.talla,
        color: s.variante.color,
        cantidad: s.cantidad,
        metodoPago: factura.metodoPago,
        tipoVenta: factura.tipoVenta,
        numeroTac: documento?.nTac ?? null,
        tacAprobado,
        precioUnitarioAplicado: s.precioUnitario,
        subtotal: s.subtotal,
        gananciaUnitaria,
        gananciaTotal: gananciaUnitaria * s.cantidad,
        observaciones: factura.observaciones,
      };
    });
  }

  private async obtenerClienteRespaldo(
    repo: Repository<Cliente>,
  ): Promise<Cliente> {
    const existente = await repo.findOne({
      where: { email: EMAIL_CLIENTE_RESPALDO },
    });
    if (existente) return existente;
    return repo.save(
      repo.create({
        uid: null,
        nombre: 'Administrador',
        email: EMAIL_CLIENTE_RESPALDO,
      }),
    );
  }

  async registrarVenta(dto: RegistrarVentaDto) {
    return this.dataSource.transaction(async (manager) => {
      const varianteRepository = manager.getRepository(VarianteProducto);
      const variante = await varianteRepository.findOne({
        where: { sku: dto.sku },
        relations: { producto: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!variante || !variante.producto.activo)
        throw new NotFoundException(`Producto no encontrado: ${dto.sku}`);
      if (variante.stock < dto.cantidad)
        throw new BadRequestException(
          `Stock insuficiente para ${dto.sku} (disponible: ${variante.stock})`,
        );

      const esTac = dto.tipoVenta === 'tac';
      if (esTac && variante.producto.precioTac === null)
        throw new BadRequestException(
          `El producto ${dto.sku} no tiene precio TAC definido`,
        );
      const precio = esTac
        ? (variante.producto.precioTac as number)
        : variante.producto.precioVenta;
      const total = precio * dto.cantidad;

      let documento: DocumentoTac | null = null;
      if (esTac) {
        const tacRepository = manager.getRepository(DocumentoTac);
        documento = await tacRepository.save(
          tacRepository.create({
            nTac:
              dto.numeroTac?.trim() ||
              `TAC-${Date.now().toString(36).toUpperCase()}`,
            variante,
            cantidad: dto.cantidad,
            precioTac: precio,
            total,
            firmaComprador: 'Pendiente',
            firmaVendedor: 'Pendiente',
          }),
        );
      }

      const facturaRepository = manager.getRepository(Factura);
      const respaldo = await this.obtenerClienteRespaldo(
        manager.getRepository(Cliente),
      );
      const factura = await facturaRepository.save(
        facturaRepository.create({
          cliente: respaldo,
          tipoDocumento: 'boleta',
          numeroDocumento: generarFolio(esTac ? 'TAC' : 'B'),
          metodoPago: dto.metodoPago,
          tipoVenta: esTac ? 'tac' : 'normal',
          documento,
          observaciones: dto.observaciones?.trim() || null,
          fecha: dto.fecha ? new Date(dto.fecha) : undefined,
          total,
        }),
      );

      await manager.getRepository(Salida).save(
        manager.getRepository(Salida).create({
          factura,
          variante,
          cantidad: dto.cantidad,
          precioUnitario: precio,
          subtotal: total,
        }),
      );

      variante.stock -= dto.cantidad;
      await varianteRepository.save(variante);

      return {
        idFactura: factura.idFactura,
        numeroDocumento: factura.numeroDocumento,
        tipoVenta: factura.tipoVenta,
        total,
      };
    });
  }

  async listarDocumentosTac() {
    const documentos = await this.dataSource
      .getRepository(DocumentoTac)
      .createQueryBuilder('d')
      .innerJoinAndSelect('d.variante', 'v')
      .innerJoinAndSelect('v.producto', 'p')
      .orderBy('d.fecha', 'DESC')
      .addOrderBy('d.id_tac', 'DESC')
      .getMany();

    return documentos.map((d) => ({
      idTac: d.idTac,
      nTac: d.nTac,
      fecha: d.fecha,
      producto: d.variante.producto.nombre,
      codigoProducto: d.variante.producto.codigoProducto,
      sku: d.variante.sku,
      talla: d.variante.talla,
      color: d.variante.color,
      cantidad: d.cantidad,
      precioTac: d.precioTac,
      total: d.total,
      firmaComprador: d.firmaComprador,
      firmaVendedor: d.firmaVendedor,
      estado: estadoTac(d.firmaComprador, d.firmaVendedor),
    }));
  }

  async actualizarFirmas(idTac: number, dto: FirmasDto) {
    const documento = await this.dataSource
      .getRepository(DocumentoTac)
      .findOne({ where: { idTac } });
    if (!documento) throw new NotFoundException('Documento TAC no encontrado');

    if (dto.firmaComprador !== undefined)
      documento.firmaComprador = dto.firmaComprador;
    if (dto.firmaVendedor !== undefined)
      documento.firmaVendedor = dto.firmaVendedor;

    await this.dataSource.getRepository(DocumentoTac).save(documento);

    return {
      idTac: documento.idTac,
      nTac: documento.nTac,
      firmaComprador: documento.firmaComprador,
      firmaVendedor: documento.firmaVendedor,
      estado: estadoTac(documento.firmaComprador, documento.firmaVendedor),
    };
  }
}
