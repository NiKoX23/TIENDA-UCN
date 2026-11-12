import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ActualizarDocumentoTacDto,
  CrearDocumentoTacDto,
  FirmasDto,
  RegistrarVentaDto,
} from './ventas.dto';
import { VentasService } from './ventas.service';

@Controller('ventas/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Get('registro')
  listarRegistro() {
    return this.ventasService.listarRegistroVentas();
  }

  @Post('registro')
  registrarVenta(@Body() dto: RegistrarVentaDto) {
    return this.ventasService.registrarVenta(dto);
  }

  @Get('tac')
  listarDocumentosTac() {
    return this.ventasService.listarDocumentosTac();
  }

  @Post('tac')
  crearDocumentoTac(@Body() dto: CrearDocumentoTacDto) {
    return this.ventasService.crearDocumentoTac(dto);
  }

  @Patch('tac/:idTac')
  actualizarDocumentoTac(
    @Param('idTac', ParseIntPipe) idTac: number,
    @Body() dto: ActualizarDocumentoTacDto,
  ) {
    return this.ventasService.actualizarDocumentoTac(idTac, dto);
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
