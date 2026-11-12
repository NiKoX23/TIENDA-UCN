import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { Producto } from '../productos/producto.entity';
import { VarianteProducto } from '../productos/variante-producto.entity';
import { Categoria } from '../productos/categoria.entity';
import { Factura } from '../facturacion/factura.entity';
import { Salida } from '../facturacion/salida.entity';
import { DocumentoTac } from '../ventas/documento-tac.entity';
import { Usuario } from '../auth/usuario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Producto,
      VarianteProducto,
      Categoria,
      Factura,
      Salida,
      DocumentoTac,
      Usuario,
    ]),
  ],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
