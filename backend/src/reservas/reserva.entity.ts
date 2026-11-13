import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../auth/usuario.entity';
import { EstadoReserva } from './estado-reserva.enum';
import { HorarioVenta } from './horario-venta.entity';
import { ItemReserva } from './item-reserva.entity';

@Entity('reservas')
export class Reserva {
  @PrimaryGeneratedColumn({ name: 'id_reserva' })
  idReserva!: number;

  @Column({ name: 'codigo_reserva', type: 'varchar', length: 30, unique: true })
  codigoReserva!: string;

  @Column({ type: 'integer', name: 'uid' })
  uid!: number;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uid' })
  usuario!: Usuario;

  @Column({ name: 'fecha_retiro', type: 'date' })
  fechaRetiro!: string;

  @Column({ name: 'id_horario', type: 'integer', nullable: true })
  idHorario!: number | null;

  @ManyToOne(() => HorarioVenta, (horario) => horario.reservas, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'id_horario' })
  horarioVenta!: HorarioVenta | null;

  @Column({
    name: 'bloque_horario',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  bloqueHorario!: string | null;

  @Column({ type: 'text', nullable: true })
  observaciones!: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: EstadoReserva.PENDIENTE,
  })
  estado!: EstadoReserva;

  @Column({ type: 'integer' })
  total!: number;

  @CreateDateColumn({
    name: 'fecha_creacion',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion!: Date;

  @UpdateDateColumn({
    name: 'fecha_actualizacion',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaActualizacion!: Date;

  @OneToMany(() => ItemReserva, (item) => item.reserva)
  items!: ItemReserva[];
}
