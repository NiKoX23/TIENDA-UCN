import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VarianteProducto } from '../productos/variante-producto.entity';
import { Reserva } from './reserva.entity';

@Entity('items_reserva')
export class ItemReserva {
  @PrimaryGeneratedColumn({ name: 'id_item' })
  idItem!: number;

  @ManyToOne(() => Reserva, (reserva) => reserva.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_reserva' })
  reserva!: Reserva;

  @ManyToOne(() => VarianteProducto, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_variante' })
  variante!: VarianteProducto;

  @Column({ type: 'integer' })
  cantidad!: number;

  @Column({ name: 'precio_unitario', type: 'integer' })
  precioUnitario!: number;

  @Column({ type: 'integer' })
  subtotal!: number;
}
