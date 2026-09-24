import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Categoria } from './categoria.entity';
import { Producto } from './producto.entity';
import { VarianteProducto } from './variante-producto.entity';
import { ProductosController } from './productos.controller';
import { ProductosAdminController } from './productos-admin.controller';
import { ProductosService } from './productos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Categoria, Producto, VarianteProducto])],
  controllers: [ProductosController, ProductosAdminController],
  providers: [ProductosService],
  exports: [TypeOrmModule, ProductosService],
})
export class ProductosModule {}
