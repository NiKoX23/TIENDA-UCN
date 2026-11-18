import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Factura } from '../facturacion/factura.entity';
import { Salida } from '../facturacion/salida.entity';
import { VendedorBiblioteca } from '../reservas/vendedor-biblioteca.entity';
import {
  crearPagina,
  type Pagina,
  patronBusqueda,
  resolverPagina,
} from '../common/paginacion';
import { DocumentoTac } from './documento-tac.entity';
import {
  ListarBoletasQueryDto,
  ListarTacQueryDto,
  type OrdenBoleta,
  type OrdenTac,
} from './dto/listar-ventas.dto';

/** Mismo contrato que cada elemento de GET /ventas/admin/registro (sin paginar). */
export interface LineaVenta {
  idSalida: number;
  idFactura: number;
  numeroDocumento: string;
  fecha: Date;
  producto: string;
  codigoProducto: string;
  sku: string;
  talla: string;
  color: string | null;
  cantidad: number;
  metodoPago: string;
  tipoVenta: 'normal' | 'tac';
  numeroTac: string | null;
  tacAprobado: 'Si' | 'Pendiente' | 'No' | null;
  precioUnitarioAplicado: number;
  subtotal: number;
  gananciaUnitaria: number;
  gananciaTotal: number;
  observaciones: string | null;
}

export interface BoletaVenta {
  idFactura: number;
  numeroDocumento: string;
  fecha: Date;
  tipoVenta: 'normal' | 'tac';
  metodoPago: string;
  observaciones: string | null;
  numeroTac: string | null;
  tacAprobado: 'Si' | 'Pendiente' | 'No' | null;
  unidades: number;
  subtotal: number;
  ganancia: number;
  lineas: LineaVenta[];
}

export interface ResumenTac {
  total: number;
  monto: number;
  aprobados: number;
  pendientes: number;
  rechazados: number;
}

export interface TotalesVentas {
  boletas: number;
  cantidad: number;
  subtotal: number;
  ganancia: number;
}

function estadoTac(
  comprador: string,
  vendedor: string,
): 'Aprobado' | 'Pendiente' | 'Rechazado' {
  if (comprador === 'Firmado' && vendedor === 'Firmado') return 'Aprobado';
  if (comprador === 'Rechazado' || vendedor === 'Rechazado') return 'Rechazado';
  return 'Pendiente';
}

// Lista blanca: el texto del usuario nunca se concatena en el SQL.
const ORDEN_BOLETA_SQL: Record<OrdenBoleta, string> = {
  'fecha-desc': 'f.fecha DESC, f.id_factura DESC',
  'fecha-asc': 'f.fecha ASC, f.id_factura ASC',
  subtotal: 'SUM(s.subtotal) DESC, f.id_factura DESC',
  cantidad: 'SUM(s.cantidad) DESC, f.id_factura DESC',
  producto: 'MIN(p.nombre) ASC, f.id_factura ASC',
};

// $1 = tipo, $2 = patrón ILIKE, $3/$4 = rango de fechas, $5 = vendedor.
// La búsqueda va en HAVING con BOOL_OR para que la boleta se calcule completa
// (todas sus líneas) aunque solo una línea coincida con el texto.
const BOLETAS_DESDE = `
  FROM facturas f
  JOIN salidas s ON s.id_factura = f.id_factura
  JOIN variantes_producto v ON v.id_variante = s.id_variante
  JOIN productos p ON p.codigo_producto = v.codigo_producto
  LEFT JOIN documentos_tac d ON d.id_tac = f.id_tac
  WHERE ($1::text IS NULL OR f.tipo_venta = $1::text)
    AND ($3::date IS NULL OR f.fecha >= $3::date)
    AND ($4::date IS NULL OR f.fecha < $4::date + INTERVAL '1 day')
    AND ($5::integer IS NULL OR f.id_vendedor = $5::integer)
  GROUP BY f.id_factura
  HAVING ($2::text IS NULL OR BOOL_OR(
    f.numero_documento ILIKE $2::text
    OR p.nombre ILIKE $2::text
    OR v.sku ILIKE $2::text
    OR v.talla ILIKE $2::text
    OR COALESCE(v.color, '') ILIKE $2::text
    OR COALESCE(d.n_tac, '') ILIKE $2::text
  ))`;

@Injectable()
export class VentasListadoService {
  constructor(private readonly dataSource: DataSource) {}

  /** Historial paginado por boleta, con filtros y orden resueltos en la base de datos. */
  async listarBoletas(query: ListarBoletasQueryDto): Promise<Pagina<BoletaVenta>> {
    return this.listarBoletasFiltradas(query, null);
  }

  async listarBoletasVendedor(
    uid: number,
    query: ListarBoletasQueryDto,
  ): Promise<Pagina<BoletaVenta>> {
    const vendedor = await this.dataSource
      .getRepository(VendedorBiblioteca)
      .findOne({
        where: { usuario: { uid } },
        select: { idVendedor: true },
      });
    if (!vendedor) throw new NotFoundException('Vendedor no encontrado');
    return this.listarBoletasFiltradas(query, vendedor.idVendedor);
  }

  private async listarBoletasFiltradas(
    query: ListarBoletasQueryDto,
    idVendedor: number | null,
  ): Promise<Pagina<BoletaVenta>> {
    const { page, limit, offset } = resolverPagina(query);
    if (query.desde && query.hasta && query.desde > query.hasta) {
      throw new BadRequestException(
        'La fecha desde no puede ser posterior a la fecha hasta',
      );
    }
    const tipo = query.tipo && query.tipo !== 'todos' ? query.tipo : null;
    const patron = patronBusqueda(query.q);
    const orden = ORDEN_BOLETA_SQL[query.orden ?? 'fecha-desc'];
    const parametros = [
      tipo,
      patron,
      query.desde ?? null,
      query.hasta ?? null,
      idVendedor,
    ];

    const [conteo] = await this.dataSource.query<Array<{ total: number }>>(
      `SELECT COUNT(*)::int AS total FROM (SELECT f.id_factura ${BOLETAS_DESDE}) t`,
      parametros,
    );
    const total = conteo?.total ?? 0;

    const filas = await this.dataSource.query<Array<{ id_factura: number }>>(
      `SELECT f.id_factura ${BOLETAS_DESDE} ORDER BY ${orden} LIMIT $6 OFFSET $7`,
      [...parametros, limit, offset],
    );
    const ids = filas.map((fila) => Number(fila.id_factura));
    if (ids.length === 0) return crearPagina([], total, page, limit);

    const salidas = await this.dataSource
      .getRepository(Salida)
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.factura', 'f')
      .leftJoinAndSelect('f.documento', 'd')
      .innerJoinAndSelect('s.variante', 'v')
      .innerJoinAndSelect('v.producto', 'p')
      .where('f.idFactura IN (:...ids)', { ids })
      .orderBy('s.idSalida', 'ASC')
      .getMany();

    const lineasPorFactura = new Map<number, LineaVenta[]>();
    for (const salida of salidas) {
      const lineas = lineasPorFactura.get(salida.factura.idFactura) ?? [];
      lineas.push(this.aLineaVenta(salida));
      lineasPorFactura.set(salida.factura.idFactura, lineas);
    }

    const data = ids.flatMap((id) => {
      const lineas = lineasPorFactura.get(id);
      return lineas?.length ? [this.aBoleta(lineas)] : [];
    });
    return crearPagina(data, total, page, limit);
  }

  /** Totales de todo el historial (no dependen de la página ni de los filtros). */
  async totalesVentas(): Promise<TotalesVentas> {
    const [fila] = await this.dataSource.query<
      Array<{ boletas: number; cantidad: number; subtotal: number; ganancia: number }>
    >(`
      SELECT
        COUNT(DISTINCT f.id_factura)::int AS boletas,
        COALESCE(SUM(s.cantidad), 0)::int AS cantidad,
        COALESCE(SUM(s.subtotal), 0)::int AS subtotal,
        COALESCE(SUM(CASE WHEN f.tipo_venta = 'tac' THEN 0
          ELSE (s.precio_unitario - COALESCE(p.precio_tac, 0)) * s.cantidad END), 0)::int AS ganancia
      FROM salidas s
      JOIN facturas f ON f.id_factura = s.id_factura
      JOIN variantes_producto v ON v.id_variante = s.id_variante
      JOIN productos p ON p.codigo_producto = v.codigo_producto
    `);
    return {
      boletas: Number(fila?.boletas ?? 0),
      cantidad: Number(fila?.cantidad ?? 0),
      subtotal: Number(fila?.subtotal ?? 0),
      ganancia: Number(fila?.ganancia ?? 0),
    };
  }

  /** Contadores y monto de todos los documentos TAC (no dependen de la página ni de los filtros). */
  async resumenTac(): Promise<ResumenTac> {
    const [fila] = await this.dataSource.query<Array<Record<string, number>>>(`
      SELECT
        COUNT(*)::int AS total,
        COALESCE(SUM(total), 0)::int AS monto,
        COUNT(*) FILTER (WHERE firma_comprador = 'Firmado' AND firma_vendedor = 'Firmado')::int AS aprobados,
        COUNT(*) FILTER (WHERE firma_comprador = 'Rechazado' OR firma_vendedor = 'Rechazado')::int AS rechazados,
        COUNT(*) FILTER (WHERE NOT (firma_comprador = 'Firmado' AND firma_vendedor = 'Firmado')
          AND firma_comprador <> 'Rechazado' AND firma_vendedor <> 'Rechazado')::int AS pendientes
      FROM documentos_tac
    `);
    return {
      total: Number(fila?.total ?? 0),
      monto: Number(fila?.monto ?? 0),
      aprobados: Number(fila?.aprobados ?? 0),
      pendientes: Number(fila?.pendientes ?? 0),
      rechazados: Number(fila?.rechazados ?? 0),
    };
  }

  /** Documentos TAC paginados; el estado (Aprobado/Pendiente/Rechazado) se deriva de las firmas. */
  async listarTac(query: ListarTacQueryDto) {
    const { page, limit, offset } = resolverPagina(query);
    const patron = patronBusqueda(query.q);

    const consulta = this.dataSource
      .getRepository(DocumentoTac)
      .createQueryBuilder('d')
      .innerJoinAndSelect('d.variante', 'v')
      .innerJoinAndSelect('v.producto', 'p');

    if (patron) {
      consulta.andWhere(
        `(d.nTac ILIKE :patron OR p.nombre ILIKE :patron OR p.codigoProducto ILIKE :patron
          OR v.sku ILIKE :patron OR v.talla ILIKE :patron OR v.color ILIKE :patron
          OR d.responsable ILIKE :patron)`,
        { patron },
      );
    }

    const ambasFirmadas = "d.firmaComprador = 'Firmado' AND d.firmaVendedor = 'Firmado'";
    const algunaRechazada = "(d.firmaComprador = 'Rechazado' OR d.firmaVendedor = 'Rechazado')";
    if (query.estado === 'Aprobado') consulta.andWhere(ambasFirmadas);
    else if (query.estado === 'Rechazado') consulta.andWhere(algunaRechazada);
    else if (query.estado === 'Pendiente')
      consulta.andWhere(`NOT (${ambasFirmadas}) AND NOT ${algunaRechazada}`);

    const orden: OrdenTac = query.orden ?? 'fecha-desc';
    if (orden === 'fecha-asc') consulta.orderBy('d.fecha', 'ASC').addOrderBy('d.idTac', 'ASC');
    else if (orden === 'total') consulta.orderBy('d.total', 'DESC').addOrderBy('d.idTac', 'DESC');
    else if (orden === 'producto') consulta.orderBy('p.nombre', 'ASC').addOrderBy('d.idTac', 'ASC');
    else consulta.orderBy('d.fecha', 'DESC').addOrderBy('d.idTac', 'DESC');

    const [documentos, total] = await consulta.skip(offset).take(limit).getManyAndCount();

    let idsVinculados = new Set<number>();
    if (documentos.length > 0) {
      const vinculadas = await this.dataSource
        .getRepository(Factura)
        .createQueryBuilder('f')
        .select('f.id_tac', 'idTac')
        .where('f.id_tac IN (:...ids)', { ids: documentos.map((d) => d.idTac) })
        .getRawMany<{ idTac: number }>();
      idsVinculados = new Set(vinculadas.map((fila) => Number(fila.idTac)));
    }

    const data = documentos.map((d) => ({
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
      responsable: d.responsable,
      firmaComprador: d.firmaComprador,
      firmaVendedor: d.firmaVendedor,
      estado: estadoTac(d.firmaComprador, d.firmaVendedor),
      tieneVenta: idsVinculados.has(d.idTac),
      tieneArchivoPdf: d.archivoPdfDisponible,
    }));
    return crearPagina(data, total, page, limit);
  }

  private aLineaVenta(s: Salida): LineaVenta {
    const factura = s.factura;
    const documento = factura.documento ?? null;
    const esTac = factura.tipoVenta === 'tac';
    const precioTac = s.variante.producto.precioTac ?? 0;
    const gananciaUnitaria = esTac ? 0 : s.precioUnitario - precioTac;

    let tacAprobado: LineaVenta['tacAprobado'] = null;
    if (esTac && documento) {
      tacAprobado =
        documento.firmaComprador === 'Firmado' && documento.firmaVendedor === 'Firmado'
          ? 'Si'
          : documento.firmaComprador === 'Rechazado' || documento.firmaVendedor === 'Rechazado'
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
  }

  private aBoleta(lineas: LineaVenta[]): BoletaVenta {
    const primera = lineas[0];
    return {
      idFactura: primera.idFactura,
      numeroDocumento: primera.numeroDocumento,
      fecha: primera.fecha,
      tipoVenta: primera.tipoVenta,
      metodoPago: primera.metodoPago,
      observaciones: primera.observaciones,
      numeroTac: primera.numeroTac,
      tacAprobado: primera.tacAprobado,
      unidades: lineas.reduce((suma, l) => suma + l.cantidad, 0),
      subtotal: lineas.reduce((suma, l) => suma + l.subtotal, 0),
      ganancia: lineas.reduce((suma, l) => suma + l.gananciaTotal, 0),
      lineas,
    };
  }
}
