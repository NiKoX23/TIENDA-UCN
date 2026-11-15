import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ListarBoletasQueryDto } from './dto/listar-ventas.dto';
import { VentasListadoService } from './ventas-listado.service';

type AuthenticatedRequest = Request & {
  user: { uid: number };
};

@Controller('ventas/vendedor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('vendedor')
export class VendedorVentasController {
  constructor(private readonly ventasListado: VentasListadoService) {}

  @Get('registro')
  listarMisVentas(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListarBoletasQueryDto,
  ) {
    return this.ventasListado.listarBoletasVendedor(request.user.uid, query);
  }
}
