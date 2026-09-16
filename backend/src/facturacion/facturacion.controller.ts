import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CrearCompraDto } from './facturacion.dto';
import { FacturacionService } from './facturacion.service';

@Controller('productos')
export class FacturacionController {
  constructor(private readonly facturacionService: FacturacionService) {}

  @Post('comprar')
  @UseGuards(JwtAuthGuard)
  crearCompra(@Req() req: { user: { uid: number } }, @Body() dto: CrearCompraDto) {
    return this.facturacionService.crearCompra(req.user.uid, dto);
  }
}