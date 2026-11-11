import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../auth/usuario.entity';
import { VarianteProducto } from '../productos/variante-producto.entity';
import { ItemReserva } from './item-reserva.entity';
import { Reserva } from './reserva.entity';
import { ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reserva, ItemReserva, Usuario, VarianteProducto]),
  ],
  controllers: [ReservasController],
  providers: [ReservasService],
})
export class ReservasModule {}
