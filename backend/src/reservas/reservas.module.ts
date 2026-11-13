import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../auth/usuario.entity';
import { VarianteProducto } from '../productos/variante-producto.entity';
import { ItemReserva } from './item-reserva.entity';
import { HorarioVenta } from './horario-venta.entity';
import { Reserva } from './reserva.entity';
import { ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';
import { HorariosVentaService } from './horarios-venta.service';
import { VendedorBiblioteca } from './vendedor-biblioteca.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reserva,
      ItemReserva,
      Usuario,
      VarianteProducto,
      VendedorBiblioteca,
      HorarioVenta,
    ]),
  ],
  controllers: [ReservasController],
  providers: [ReservasService, HorariosVentaService],
})
export class ReservasModule {}
