import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../auth/usuario.entity';
import { Cliente } from '../clientes/cliente.entity';
import { Factura } from '../facturacion/factura.entity';
import { Salida } from '../facturacion/salida.entity';
import { VarianteProducto } from '../productos/variante-producto.entity';
import { DocumentoTac } from './documento-tac.entity';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Factura,
      Salida,
      DocumentoTac,
      VarianteProducto,
      Usuario,
      Cliente,
    ]),
  ],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}
