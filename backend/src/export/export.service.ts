import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Producto } from '../productos/producto.entity';
import { VarianteProducto } from '../productos/variante-producto.entity';
import { Factura } from '../facturacion/factura.entity';
import { Salida } from '../facturacion/salida.entity';
import { DocumentoTac } from '../ventas/documento-tac.entity';
import { Usuario } from '../auth/usuario.entity';

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    @InjectRepository(VarianteProducto)
    private readonly varianteRepo: Repository<VarianteProducto>,
    @InjectRepository(Factura)
    private readonly facturaRepo: Repository<Factura>,
    @InjectRepository(Salida)
    private readonly salidaRepo: Repository<Salida>,
    @InjectRepository(DocumentoTac)
    private readonly tacRepo: Repository<DocumentoTac>,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
  ) {}

  private async generarInventarioWB(): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tienda UCN';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Inventario');

    // Títulos como en el Excel original
    sheet.mergeCells('A1:K1');
    sheet.getCell('A1').value = 'INVENTARIO TIENDA UCN';
    sheet.getCell('A1').font = { bold: true, size: 14 };
    sheet.mergeCells('A2:K2');
    sheet.getCell('A2').value = `Ultima actualizacion: ${new Date().toLocaleString('es-CL')}`;
    sheet.mergeCells('A3:K3');
    sheet.getCell('A3').value = 'NOTA: El Precio TAC es SIN IVA (documento fisico de transferencia con firma de ambas partes: comprador y vendedor)';

    // Cabeceras (fila 5)
    const headers = [
      'N',
      'PRODUCTO',
      'CANTIDAD\nINICIAL',
      'PRECIO VENTA\nCON IVA ($)',
      'PRECIO TAC\n(SIN IVA) ($)',
      'STOCK\nACTUAL',
      'UNIDADES\nVENDIDAS',
      'MARGEN vs TAC\n(Venta-TAC) ($)',
      'INGRESO TOTAL\nVENTAS ($)',
      'INGRESO TOTAL\nTAC ($)',
      'ESTADO\nSTOCK',
    ];
    sheet.getRow(5).values = headers;
    sheet.getRow(5).font = { bold: true };
    sheet.getRow(5).alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    sheet.getRow(5).height = 30;

    // Obtener inventario con vendidos
    const variantes = await this.varianteRepo.find({
      relations: { producto: { categoria: true } },
      where: { producto: { activo: true } },
      order: { producto: { codigoProducto: 'ASC' }, idVariante: 'ASC' },
    });

    // Calcular vendidos por variante
    const vendidosPorVariante = await this.salidaRepo
      .createQueryBuilder('s')
      .select('s.id_variante', 'idVariante')
      .addSelect('SUM(s.cantidad)', 'vendidas')
      .groupBy('s.id_variante')
      .getRawMany();

    const vendidosMap = new Map<number, number>();
    for (const v of vendidosPorVariante) {
      vendidosMap.set(Number(v.idVariante), Number(v.vendidas) || 0);
    }

    let rowNum = 6;
    let totalInicial = 0;
    let totalStock = 0;
    let totalVendidas = 0;
    let totalIngresoVentas = 0;
    let totalIngresoTac = 0;

    for (let i = 0; i < variantes.length; i++) {
      const varProd = variantes[i];
      const producto = varProd.producto;
      const vendidas = vendidosMap.get(varProd.idVariante) || 0;
      const inicial = varProd.stock + vendidas;
      const precioVenta = Number(producto.precioVenta) || 0;
      const precioTac = Number(producto.precioTac) || 0;
      const margen = precioVenta - precioTac;
      const ingresoVentas = precioVenta * vendidas;
      const ingresoTac = precioTac * vendidas;
      let estado = 'ALTO';
      if (varProd.stock <= 5) estado = 'CRITICO';
      else if (varProd.stock <= 20) estado = 'BAJO';
      else if (varProd.stock <= 50) estado = 'NORMAL';
      else estado = 'ALTO';

      const row = sheet.getRow(rowNum);
      row.values = [
        i + 1,
        producto.nombre,
        inicial,
        precioVenta,
        precioTac,
        varProd.stock,
        vendidas,
        margen,
        ingresoVentas,
        ingresoTac,
        estado,
      ];
      row.getCell(4).numFmt = '#,##0';
      row.getCell(5).numFmt = '#,##0';
      row.getCell(8).numFmt = '#,##0';
      row.getCell(9).numFmt = '#,##0';
      row.getCell(10).numFmt = '#,##0';

      totalInicial += inicial;
      totalStock += varProd.stock;
      totalVendidas += vendidas;
      totalIngresoVentas += ingresoVentas;
      totalIngresoTac += ingresoTac;

      rowNum++;
    }

    // Fila TOTAL
    const totalRow = sheet.getRow(rowNum);
    totalRow.values = ['', 'TOTAL', totalInicial, '', '', totalStock, totalVendidas, '', totalIngresoVentas, totalIngresoTac, ''];
    totalRow.font = { bold: true };
    totalRow.getCell(9).numFmt = '#,##0';
    totalRow.getCell(10).numFmt = '#,##0';

    // Ajustar anchos
    sheet.columns = [
      { width: 5 },
      { width: 30 },
      { width: 18 },
      { width: 22 },
      { width: 22 },
      { width: 16 },
      { width: 16 },
      { width: 22 },
      { width: 22 },
      { width: 22 },
      { width: 18 },
    ];

    return workbook;
  }

  private async generarVentasWB(): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tienda UCN';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Registro Ventas');

    sheet.mergeCells('A1:M1');
    sheet.getCell('A1').value = 'REGISTRO DE VENTAS - TIENDA UCN';
    sheet.getCell('A1').font = { bold: true, size: 14 };
    sheet.mergeCells('A2:M2');
    sheet.getCell('A2').value = 'Complete las columnas con fondo BLANCO. Las columnas con formulas se calculan solas.';
    sheet.mergeCells('A3:M3');
    sheet.getCell('A3').value = 'TAC = Documento fisico de transferencia (sin IVA). Requiere firma de ambas partes.';

    const headers = [
      'N VENTA',
      'FECHA',
      'PRODUCTO',
      'CANTIDAD\nVENDIDA',
      'METODO\nDE PAGO',
      'TIPO DE\nVENTA',
      'N DOC.\nTAC',
      'TAC APROBADO\n(Ambas Partes)',
      'PRECIO UNIT.\nAPLICADO ($)',
      'SUBTOTAL ($)',
      'GANANCIA\nUNIT. ($)',
      'GANANCIA\nTOTAL ($)',
      'OBSERVACIONES',
    ];
    sheet.getRow(5).values = headers;
    sheet.getRow(5).font = { bold: true };
    sheet.getRow(5).alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    sheet.getRow(5).height = 35;

    // Obtener todo el historial por línea desde BD (app)
    const salidas = await this.salidaRepo.find({
      relations: {
        factura: { documento: true },
        variante: { producto: true },
      },
      order: { factura: { fecha: 'ASC' }, idSalida: 'ASC' },
    });

    let rowNum = 6;
    for (const s of salidas) {
      const factura = s.factura;
      const variante = s.variante;
      const producto = variante.producto;
      const documento = factura.documento;
      const esTac = factura.tipoVenta === 'tac';
      const precioTac = Number(producto.precioTac) || 0;
      const gananciaUnitaria = esTac ? 0 : Number(s.precioUnitario) - precioTac;

      let tacAprobado = '';
      if (esTac && documento) {
        if (documento.firmaComprador === 'Firmado' && documento.firmaVendedor === 'Firmado') {
          tacAprobado = 'Si';
        } else if (documento.firmaComprador === 'Rechazado' || documento.firmaVendedor === 'Rechazado') {
          tacAprobado = 'No';
        } else {
          tacAprobado = 'Pendiente';
        }
      }

      const row = sheet.getRow(rowNum);
      row.values = [
        factura.numeroDocumento || factura.idFactura,
        factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-CL') : '',
        producto.nombre,
        s.cantidad,
        factura.metodoPago,
        esTac ? 'TAC' : 'Normal',
        documento?.nTac || '',
        tacAprobado,
        Number(s.precioUnitario),
        Number(s.subtotal),
        gananciaUnitaria,
        gananciaUnitaria * s.cantidad,
        factura.observaciones || '',
      ];
      row.getCell(9).numFmt = '#,##0';
      row.getCell(10).numFmt = '#,##0';
      row.getCell(11).numFmt = '#,##0';
      row.getCell(12).numFmt = '#,##0';
      rowNum++;
    }

    sheet.columns = [
      { width: 15 },
      { width: 12 },
      { width: 30 },
      { width: 16 },
      { width: 16 },
      { width: 14 },
      { width: 18 },
      { width: 20 },
      { width: 18 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
      { width: 40 },
    ];

    return workbook;
  }

  private async generarTacWB(): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tienda UCN';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Control TAC');

    sheet.mergeCells('A1:H1');
    sheet.getCell('A1').value = 'CONTROL DE DOCUMENTOS TAC';
    sheet.getCell('A1').font = { bold: true, size: 14 };
    sheet.mergeCells('A2:H2');
    sheet.getCell('A2').value = 'TAC: Documento fisico de transferencia | Cuenta origen-destino | Sin IVA | Requiere firma de comprador y vendedor';

    const headers = [
      'N TAC',
      'FECHA',
      'PRODUCTO',
      'CANTIDAD',
      'PRECIO TAC\n(SIN IVA) ($)',
      'TOTAL ($)',
      'FIRMA\nCOMPRADOR',
      'FIRMA\nVENDEDOR',
    ];
    sheet.getRow(4).values = headers;
    sheet.getRow(4).font = { bold: true };
    sheet.getRow(4).alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    sheet.getRow(4).height = 30;

    const documentos = await this.tacRepo.find({
      relations: { variante: { producto: true } },
      order: { fecha: 'ASC', idTac: 'ASC' },
    });

    let rowNum = 5;
    for (const d of documentos) {
      const row = sheet.getRow(rowNum);
      row.values = [
        d.nTac,
        d.fecha ? new Date(d.fecha).toLocaleDateString('es-CL') : '',
        d.variante?.producto?.nombre || '',
        d.cantidad,
        Number(d.precioTac),
        Number(d.total),
        d.firmaComprador,
        d.firmaVendedor,
      ];
      row.getCell(5).numFmt = '#,##0';
      row.getCell(6).numFmt = '#,##0';
      rowNum++;
    }

    sheet.columns = [
      { width: 18 },
      { width: 12 },
      { width: 30 },
      { width: 12 },
      { width: 22 },
      { width: 16 },
      { width: 16 },
      { width: 16 },
    ];

    return workbook;
  }

  private async generarUsuariosWB(): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tienda UCN';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Usuarios');
    const headers = ['UID', 'NOMBRE', 'EMAIL', 'PROVEEDOR AUTH', 'ROL'];
    sheet.getRow(1).values = headers;
    sheet.getRow(1).font = { bold: true };

    const usuarios = await this.usuarioRepo.find({
      order: { uid: 'ASC' },
    });

    let rowNum = 2;
    for (const u of usuarios) {
      const row = sheet.getRow(rowNum);
      row.values = [
        u.uid,
        u.nombre,
        u.email,
        u.proveedorAuth,
        u.esAdmin ? 'Admin' : 'Usuario',
      ];
      rowNum++;
    }

    sheet.columns = [
      { width: 10 },
      { width: 30 },
      { width: 40 },
      { width: 18 },
      { width: 12 },
    ];

    return workbook;
  }

  async exportarInventario(): Promise<Buffer> {
    const wb = await this.generarInventarioWB();
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  async exportarVentas(): Promise<Buffer> {
    const wb = await this.generarVentasWB();
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  async exportarTac(): Promise<Buffer> {
    const wb = await this.generarTacWB();
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  async exportarUsuarios(): Promise<Buffer> {
    const wb = await this.generarUsuariosWB();
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  async exportarTodo(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tienda UCN';
    workbook.created = new Date();

    // Copiar hojas
    const wbInv = await this.generarInventarioWB();
    const invSheet = wbInv.getWorksheet('Inventario');
    if (invSheet) {
      workbook.addWorksheet('Inventario');
      const target = workbook.getWorksheet('Inventario')!;
      invSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const newRow = target.getRow(rowNumber);
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          newRow.getCell(colNumber).value = cell.value;
          newRow.getCell(colNumber).style = cell.style;
        });
        newRow.height = row.height;
      });
      target.columns = invSheet.columns.map(c => ({ width: c.width }));
    }

    const wbVen = await this.generarVentasWB();
    const venSheet = wbVen.getWorksheet('Registro Ventas');
    if (venSheet) {
      const target = workbook.addWorksheet('Registro Ventas');
      venSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const newRow = target.getRow(rowNumber);
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          newRow.getCell(colNumber).value = cell.value;
          newRow.getCell(colNumber).style = cell.style;
        });
        newRow.height = row.height;
      });
      target.columns = venSheet.columns.map(c => ({ width: c.width }));
    }

    const wbTac = await this.generarTacWB();
    const tacSheet = wbTac.getWorksheet('Control TAC');
    if (tacSheet) {
      const target = workbook.addWorksheet('Control TAC');
      tacSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const newRow = target.getRow(rowNumber);
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          newRow.getCell(colNumber).value = cell.value;
          newRow.getCell(colNumber).style = cell.style;
        });
        newRow.height = row.height;
      });
      target.columns = tacSheet.columns.map(c => ({ width: c.width }));
    }

    const wbUsr = await this.generarUsuariosWB();
    const usrSheet = wbUsr.getWorksheet('Usuarios');
    if (usrSheet) {
      const target = workbook.addWorksheet('Usuarios');
      usrSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const newRow = target.getRow(rowNumber);
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          newRow.getCell(colNumber).value = cell.value;
          newRow.getCell(colNumber).style = cell.style;
        });
        newRow.height = row.height;
      });
      target.columns = usrSheet.columns.map(c => ({ width: c.width }));
    }

    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
