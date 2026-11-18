import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArchivosModule } from '../common/archivos.module';
import { Usuario } from '../auth/usuario.entity';
import { Cliente } from '../clientes/cliente.entity';
import { Factura } from '../facturacion/factura.entity';
import { Salida } from '../facturacion/salida.entity';
import { VarianteProducto } from '../productos/variante-producto.entity';
import { VendedorBiblioteca } from '../reservas/vendedor-biblioteca.entity';
import { DocumentoTac } from './documento-tac.entity';
import { VentasController } from './ventas.controller';
import { VendedorVentasController } from './vendedor-ventas.controller';
import { VentasService } from './ventas.service';
import { VentasListadoService } from './ventas-listado.service';

@Module({
  imports: [
    ArchivosModule,
    TypeOrmModule.forFeature([
      Factura,
      Salida,
      DocumentoTac,
      VarianteProducto,
      Usuario,
      Cliente,
      VendedorBiblioteca,
    ]),
  ],
  controllers: [VentasController, VendedorVentasController],
  providers: [VentasService, VentasListadoService],
})
export class VentasModule {}
