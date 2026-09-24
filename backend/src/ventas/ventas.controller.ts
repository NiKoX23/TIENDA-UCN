import {
  Body,
  Controller,
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
import { FirmasDto, RegistrarVentaDto } from './ventas.dto';
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

  @Patch('tac/:idTac/firmas')
  actualizarFirmas(
    @Param('idTac', ParseIntPipe) idTac: number,
    @Body() dto: FirmasDto,
  ) {
    return this.ventasService.actualizarFirmas(idTac, dto);
  }
}
