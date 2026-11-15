import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Cliente } from '../clientes/cliente.entity';
import { Factura } from '../facturacion/factura.entity';
import { Salida } from '../facturacion/salida.entity';
import { VarianteProducto } from '../productos/variante-producto.entity';
import { VendedorBiblioteca } from '../reservas/vendedor-biblioteca.entity';
import { DocumentoTac } from './documento-tac.entity';
import { patronBusqueda } from '../common/paginacion';
import {
  ActualizarDocumentoTacDto,
  CrearDocumentoTacDto,
  FirmasDto,
  RegistrarVentaDto,
} from './ventas.dto';

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
const HOJA_REGISTRO_VENTAS = 'Registro de ventas';

interface LineaVentaHistorica {
  sku: string;
  cantidad: number;
  total: number;
}

interface VentaHistorica {
  id: number;
  fecha: Date;
  numeroDocumento: string;
  lineas: LineaVentaHistorica[];
}

type DocumentoTacDetalle = {
  idTac: number;
  nTac: string;
  fecha: Date;
  producto: string;
  codigoProducto: string;
  sku: string;
  talla: string;
  color: string | null;
  cantidad: number;
  precioTac: number;
  total: number;
  responsable: string | null;
  firmaComprador: DocumentoTac['firmaComprador'];
  firmaVendedor: DocumentoTac['firmaVendedor'];
  estado: 'Aprobado' | 'Pendiente' | 'Rechazado';
  tieneVenta: boolean;
};

@Injectable()
export class VentasService implements OnModuleInit {
  private readonly logger = new Logger(VentasService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    const rutaExcel = this.obtenerRutaExcelHistorico();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(rutaExcel);
    const hoja = workbook.getWorksheet(HOJA_REGISTRO_VENTAS);
    if (!hoja) {
      throw new Error(
        `No se encontró la hoja "${HOJA_REGISTRO_VENTAS}" en ${rutaExcel}`,
      );
    }

    const ventas = this.leerVentasHistoricas(hoja);
    if (ventas.length === 0) {
      this.logger.log(
        `No hay ventas históricas para importar desde ${rutaExcel}`,
      );
      return;
    }

    const existentes = await this.dataSource.getRepository(Factura).find({
      select: { numeroDocumento: true },
      where: {
        numeroDocumento: In(ventas.map((venta) => venta.numeroDocumento)),
      },
    });
    const documentosExistentes = new Set(
      existentes.map((factura) => factura.numeroDocumento),
    );
    const pendientes = ventas.filter(
      (venta) => !documentosExistentes.has(venta.numeroDocumento),
    );
    if (pendientes.length === 0) {
      this.logger.log(
        'Las ventas históricas de Productos.xlsx ya están importadas',
      );
      return;
    }

    await this.importarVentasHistoricas(pendientes);
    const cantidadLineas = pendientes.reduce(
      (total, venta) => total + venta.lineas.length,
      0,
    );
    this.logger.log(
      `Importadas ${cantidadLineas} líneas históricas en ${pendientes.length} boletas; stock actual sin cambios.`,
    );
  }

  private obtenerRutaExcelHistorico(): string {
    const configurada = process.env.LEGACY_SALES_FILE;
    if (configurada) {
      if (!existsSync(configurada)) {
        throw new Error(
          `No se encontró el archivo de ventas históricas: ${configurada}`,
        );
      }
      return configurada;
    }

    const rutas = [
      resolve(process.cwd(), 'docs', 'Productos.xlsx'),
      resolve(process.cwd(), '..', 'docs', 'Productos.xlsx'),
    ];
    const encontrada = rutas.find((ruta) => existsSync(ruta));
    if (!encontrada) {
      throw new Error(
        'No se encontró docs/Productos.xlsx. Configura LEGACY_SALES_FILE con la ruta del archivo.',
      );
    }
    return encontrada;
  }

  private leerVentasHistoricas(hoja: ExcelJS.Worksheet): VentaHistorica[] {
    const ventas = new Map<string, VentaHistorica>();
    hoja.eachRow((fila, numeroFila) => {
      if (numeroFila <= 2) return;

      const idOriginal = Number(fila.getCell(1).value);
      const id = Math.round(idOriginal);
      const fechaValor = fila.getCell(2).value;
      const skuValor = fila.getCell(3).value;
      const cantidad = Number(fila.getCell(4).value);
      const totalCelda = fila.getCell(5).value;
      const totalValor =
        typeof totalCelda === 'object' &&
        totalCelda !== null &&
        'result' in totalCelda
          ? totalCelda.result
          : totalCelda;
      const total = Number(totalValor);

      if (
        fila.getCell(1).value == null &&
        fechaValor == null &&
        skuValor == null &&
        fila.getCell(4).value == null &&
        totalCelda == null
      ) {
        return;
      }

      const fecha =
        fechaValor instanceof Date
          ? fechaValor
          : typeof fechaValor === 'string' || typeof fechaValor === 'number'
            ? new Date(fechaValor)
            : new Date(Number.NaN);
      if (
        !Number.isFinite(idOriginal) ||
        id < 1 ||
        Number.isNaN(fecha.getTime()) ||
        typeof skuValor !== 'string' ||
        !skuValor.trim() ||
        !Number.isInteger(cantidad) ||
        cantidad <= 0 ||
        !Number.isInteger(total) ||
        total < 0 ||
        total % cantidad !== 0
      ) {
        throw new Error(
          `Datos inválidos en la fila ${numeroFila} de ${HOJA_REGISTRO_VENTAS}`,
        );
      }
      if (!Number.isInteger(idOriginal)) {
        this.logger.warn(
          `ID de venta no entero en fila ${numeroFila}; se redondeó ${idOriginal} a ${id}.`,
        );
      }

      const fechaKey = fecha.toISOString().slice(0, 10);
      const clave = `${id}-${fechaKey}`;
      let venta = ventas.get(clave);
      if (!venta) {
        const fechaDocumento = fechaKey.replaceAll('-', '');
        const numeroDocumento = `XLSX-${id}-${fechaDocumento}`;
        if (numeroDocumento.length > 20) {
          throw new Error(
            `El ID de venta ${id} excede el largo permitido para la boleta`,
          );
        }
        venta = {
          id,
          fecha: new Date(`${fechaKey}T12:00:00.000Z`),
          numeroDocumento,
          lineas: [],
        };
        ventas.set(clave, venta);
      }
      venta.lineas.push({ sku: skuValor.trim(), cantidad, total });
    });

    return [...ventas.values()];
  }

  private async importarVentasHistoricas(
    ventas: VentaHistorica[],
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const variantes = await manager.getRepository(VarianteProducto).find({
        where: {
          sku: In([
            ...new Set(
              ventas.flatMap((venta) => venta.lineas.map((linea) => linea.sku)),
            ),
          ]),
        },
        relations: { producto: true },
      });
      const variantesPorSku = new Map(
        variantes.map((variante) => [variante.sku, variante]),
      );
      const skusFaltantes = [
        ...new Set(
          ventas.flatMap((venta) =>
            venta.lineas
              .filter((linea) => !variantesPorSku.has(linea.sku))
              .map((linea) => linea.sku),
          ),
        ),
      ];
      if (skusFaltantes.length > 0) {
        throw new NotFoundException(
          `No se puede importar el historial; faltan SKU en el catálogo: ${skusFaltantes.join(', ')}`,
        );
      }

      const facturaRepository = manager.getRepository(Factura);
      const salidaRepository = manager.getRepository(Salida);
      const cliente = await this.obtenerClienteRespaldo(
        manager.getRepository(Cliente),
      );

      for (const venta of ventas) {
        const total = venta.lineas.reduce(
          (suma, linea) => suma + linea.total,
          0,
        );
        const factura = await facturaRepository.save(
          facturaRepository.create({
            cliente,
            tipoDocumento: 'boleta',
            numeroDocumento: venta.numeroDocumento,
            metodoPago: 'histórico Excel',
            tipoVenta: 'normal',
            observaciones: `Importada desde Productos.xlsx (ID ${venta.id})`,
            fecha: venta.fecha,
            total,
          }),
        );

        await salidaRepository.save(
          venta.lineas.map((linea) => {
            const variante = variantesPorSku.get(linea.sku);
            if (!variante) {
              throw new NotFoundException(
                `Variante no encontrada: ${linea.sku}`,
              );
            }
            return salidaRepository.create({
              factura,
              variante,
              cantidad: linea.cantidad,
              precioUnitario: linea.total / linea.cantidad,
              subtotal: linea.total,
            });
          }),
        );
      }
    });
  }

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
      const vendedor = dto.idVendedor
        ? await manager.getRepository(VendedorBiblioteca).findOne({
            where: { idVendedor: dto.idVendedor, activo: true },
            relations: { usuario: true },
          })
        : null;
      if (dto.idVendedor && !vendedor?.usuario) {
        throw new NotFoundException('Vendedor no encontrado o inactivo');
      }
      if (dto.tipoVenta === 'normal' && !vendedor) {
        throw new BadRequestException(
          'Selecciona el vendedor responsable de la venta',
        );
      }

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
          vendedorResponsable: vendedor,
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

  async buscarVendedoresVenta(q: string) {
    const patron = patronBusqueda(q);
    if (!patron) return [];

    const vendedores = await this.dataSource
      .getRepository(VendedorBiblioteca)
      .createQueryBuilder('vendedor')
      .innerJoinAndSelect('vendedor.usuario', 'usuario')
      .select([
        'vendedor.idVendedor',
        'vendedor.nombre',
        'usuario.uid',
        'usuario.nombre',
        'usuario.email',
      ])
      .where('vendedor.activo = true')
      .andWhere('usuario.email ILIKE :patron', { patron })
      .orderBy('usuario.email', 'ASC')
      .take(8)
      .getMany();

    return vendedores.map((vendedor) => ({
      idVendedor: vendedor.idVendedor,
      nombre: vendedor.usuario?.nombre ?? vendedor.nombre,
      email: vendedor.usuario?.email ?? '',
    }));
  }

  private async obtenerDetalleTac(idTac: number): Promise<DocumentoTacDetalle> {
    const d = await this.dataSource
      .getRepository(DocumentoTac)
      .createQueryBuilder('d')
      .innerJoinAndSelect('d.variante', 'v')
      .innerJoinAndSelect('v.producto', 'p')
      .where('d.id_tac = :idTac', { idTac })
      .getOne();
    if (!d) throw new NotFoundException('Documento TAC no encontrado');
    const tieneVenta = await this.dataSource.getRepository(Factura).exists({
      where: { documento: { idTac } },
    });

    return {
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
      tieneVenta,
    };
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

    const facturasVinculadas = await this.dataSource
      .getRepository(Factura)
      .createQueryBuilder('f')
      .select('f.id_tac', 'idTac')
      .where('f.id_tac IS NOT NULL')
      .getRawMany<{ idTac: number }>();
    const idsVinculados = new Set(
      facturasVinculadas.map((factura) => Number(factura.idTac)),
    );

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
      responsable: d.responsable,
      firmaComprador: d.firmaComprador,
      firmaVendedor: d.firmaVendedor,
      estado: estadoTac(d.firmaComprador, d.firmaVendedor),
      tieneVenta: idsVinculados.has(d.idTac),
    }));
  }

  async crearDocumentoTac(dto: CrearDocumentoTacDto) {
    const variante = await this.dataSource
      .getRepository(VarianteProducto)
      .findOne({
        where: { sku: dto.sku },
        relations: { producto: true },
      });
    if (!variante)
      throw new NotFoundException(`Variante no encontrada: ${dto.sku}`);

    const precioTac = dto.precioTac ?? variante.producto.precioTac;
    if (precioTac === null)
      throw new BadRequestException('El producto no tiene precio TAC definido');

    const documento = await this.dataSource.getRepository(DocumentoTac).save(
      this.dataSource.getRepository(DocumentoTac).create({
        nTac: dto.nTac?.trim() || generarFolio('TAC'),
        fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
        variante,
        cantidad: dto.cantidad,
        precioTac,
        total: dto.cantidad * precioTac,
        responsable: dto.responsable?.trim() || null,
        firmaComprador: dto.firmaComprador ?? 'Pendiente',
        firmaVendedor: dto.firmaVendedor ?? 'Pendiente',
      }),
    );
    return this.obtenerDetalleTac(documento.idTac);
  }

  async actualizarDocumentoTac(idTac: number, dto: ActualizarDocumentoTacDto) {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(DocumentoTac);
      const documento = await repo.findOne({
        where: { idTac },
        relations: { variante: { producto: true } },
      });
      if (!documento)
        throw new NotFoundException('Documento TAC no encontrado');
      const tieneVenta = await manager.getRepository(Factura).exists({
        where: { documento: { idTac } },
      });
      if (
        tieneVenta &&
        (dto.sku !== undefined ||
          dto.cantidad !== undefined ||
          dto.precioTac !== undefined)
      ) {
        throw new BadRequestException(
          'No se puede cambiar producto, cantidad o precio de un TAC asociado a una venta',
        );
      }

      if (dto.sku !== undefined) {
        const variante = await manager.getRepository(VarianteProducto).findOne({
          where: { sku: dto.sku },
          relations: { producto: true },
        });
        if (!variante)
          throw new NotFoundException(`Variante no encontrada: ${dto.sku}`);
        documento.variante = variante;
      }
      if (dto.nTac !== undefined) documento.nTac = dto.nTac.trim();
      if (dto.fecha !== undefined) documento.fecha = new Date(dto.fecha);
      if (dto.cantidad !== undefined) documento.cantidad = dto.cantidad;
      if (dto.precioTac !== undefined) documento.precioTac = dto.precioTac;
      if (dto.responsable !== undefined)
        documento.responsable = dto.responsable.trim() || null;
      if (dto.firmaComprador !== undefined)
        documento.firmaComprador = dto.firmaComprador;
      if (dto.firmaVendedor !== undefined)
        documento.firmaVendedor = dto.firmaVendedor;
      documento.total = documento.cantidad * documento.precioTac;
      await repo.save(documento);
    });
    return this.obtenerDetalleTac(idTac);
  }

  async eliminarDocumentoTac(idTac: number) {
    const repo = this.dataSource.getRepository(DocumentoTac);
    const documento = await repo.findOne({ where: { idTac } });
    if (!documento) throw new NotFoundException('Documento TAC no encontrado');
    const tieneVenta = await this.dataSource.getRepository(Factura).exists({
      where: { documento: { idTac } },
    });
    if (tieneVenta)
      throw new BadRequestException(
        'No se puede eliminar un TAC asociado a una venta registrada',
      );
    await repo.remove(documento);
    return { idTac, eliminado: true };
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
