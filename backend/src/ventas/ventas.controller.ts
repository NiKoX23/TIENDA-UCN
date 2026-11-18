import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { ArchivoSubido } from '../common/archivos.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  BuscarVendedoresVentaQueryDto,
  ActualizarDocumentoTacDto,
  CrearDocumentoTacDto,
  FirmasDto,
  RegistrarVentaDto,
} from './ventas.dto';
import {
  ListarBoletasQueryDto,
  ListarTacQueryDto,
} from './dto/listar-ventas.dto';
import { VentasService } from './ventas.service';
import { VentasListadoService } from './ventas-listado.service';

@Controller('ventas/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class VentasController {
  constructor(
    private readonly ventasService: VentasService,
    private readonly ventasListado: VentasListadoService,
  ) {}

  /**
   * Sin `page`: arreglo de líneas de venta (comportamiento anterior).
   * Con `page`: boletas paginadas { data, total, page, limit, totalPages }.
   */
  @Get('registro')
  listarRegistro(@Query() query: ListarBoletasQueryDto) {
    return query.page === undefined
      ? this.ventasService.listarRegistroVentas()
      : this.ventasListado.listarBoletas(query);
  }

  @Get('registro/totales')
  totalesRegistro() {
    return this.ventasListado.totalesVentas();
  }

  @Get('vendedores')
  buscarVendedores(@Query() query: BuscarVendedoresVentaQueryDto) {
    return this.ventasService.buscarVendedoresVenta(query.q);
  }

  @Post('registro')
  registrarVenta(@Body() dto: RegistrarVentaDto) {
    return this.ventasService.registrarVenta(dto);
  }

  @Get('tac/resumen')
  resumenTac() {
    return this.ventasListado.resumenTac();
  }

  /** Sin `page`: arreglo completo. Con `page`: documentos TAC paginados. */
  @Get('tac')
  listarDocumentosTac(@Query() query: ListarTacQueryDto) {
    return query.page === undefined
      ? this.ventasService.listarDocumentosTac()
      : this.ventasListado.listarTac(query);
  }

  @Post('tac')
  @UseInterceptors(FileInterceptor('archivo'))
  crearDocumentoTac(
    @Body() dto: CrearDocumentoTacDto,
    @UploadedFile() archivo?: ArchivoSubido,
  ) {
    return this.ventasService.crearDocumentoTac(dto, archivo);
  }

  @Patch('tac/:idTac')
  @UseInterceptors(FileInterceptor('archivo'))
  actualizarDocumentoTac(
    @Param('idTac', ParseIntPipe) idTac: number,
    @Body() dto: ActualizarDocumentoTacDto,
    @UploadedFile() archivo?: ArchivoSubido,
  ) {
    return this.ventasService.actualizarDocumentoTac(idTac, dto, archivo);
  }

  @Get('tac/:idTac/archivo')
  async obtenerArchivoTac(
    @Param('idTac', ParseIntPipe) idTac: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const pdf = await this.ventasService.obtenerArchivoTac(idTac);
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdf.length,
      'Content-Disposition': `inline; filename="documento-TAC-${idTac}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return pdf;
  }

  @Delete('tac/:idTac')
  eliminarDocumentoTac(@Param('idTac', ParseIntPipe) idTac: number) {
    return this.ventasService.eliminarDocumentoTac(idTac);
  }

  @Patch('tac/:idTac/firmas')
  actualizarFirmas(
    @Param('idTac', ParseIntPipe) idTac: number,
    @Body() dto: FirmasDto,
  ) {
    return this.ventasService.actualizarFirmas(idTac, dto);
  }
}
