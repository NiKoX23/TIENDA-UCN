import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientesModule } from '../clientes/clientes.module';
import { Usuario } from '../auth/usuario.entity';
import { ProductosModule } from '../productos/productos.module';
import { FacturacionController } from './facturacion.controller';
import { FacturacionService } from './facturacion.service';
import { Factura } from './factura.entity';
import { Salida } from './salida.entity';

@Module({
  imports: [
    ClientesModule,
    ProductosModule,
    TypeOrmModule.forFeature([Usuario, Factura, Salida]),
  ],
  controllers: [FacturacionController],
  providers: [FacturacionService],
})
export class FacturacionModule {}
