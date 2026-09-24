import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProductosService } from './productos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ActualizarProductoDto,
  AjustarStockDto,
  CrearProductoDto,
  VarianteDto,
} from './dto/productos-admin.dto';

@Controller('productos/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ProductosAdminController {
  constructor(private readonly productosService: ProductosService) {}

  @Get('inventario')
  listarInventario() {
    return this.productosService.listarInventario();
  }

  @Patch('inventario/:sku/stock')
  ajustarStock(@Param('sku') sku: string, @Body() dto: AjustarStockDto) {
    return this.productosService.ajustarStock(sku, dto.stock);
  }

  @Post('inventario')
  crearProducto(@Body() dto: CrearProductoDto) {
    return this.productosService.crearProducto(dto);
  }

  @Patch('inventario/:codigoProducto')
  actualizarProducto(
    @Param('codigoProducto') codigoProducto: string,
    @Body() dto: ActualizarProductoDto,
  ) {
    return this.productosService.actualizarProducto(codigoProducto, dto);
  }

  @Post('inventario/:codigoProducto/variantes')
  agregarVariante(
    @Param('codigoProducto') codigoProducto: string,
    @Body() dto: VarianteDto,
  ) {
    return this.productosService.agregarVariante(codigoProducto, dto);
  }
}
