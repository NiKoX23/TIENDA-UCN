import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Reserva } from './reserva.entity';
import { VendedorBiblioteca } from './vendedor-biblioteca.entity';

@Entity('horarios_venta')
export class HorarioVenta {
  @PrimaryGeneratedColumn({ name: 'id_horario' })
  idHorario!: number;

  @Column({ name: 'id_vendedor', type: 'integer' })
  idVendedor!: number;

  @ManyToOne(() => VendedorBiblioteca, (vendedor) => vendedor.horarios, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'id_vendedor' })
  vendedor!: VendedorBiblioteca;

  @Column({ type: 'date' })
  fecha!: string;

  @Column({ name: 'hora_inicio', type: 'time' })
  horaInicio!: string;

  @Column({ name: 'hora_termino', type: 'time' })
  horaTermino!: string;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn({
    name: 'fecha_creacion',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion!: Date;

  @OneToMany(() => Reserva, (reserva) => reserva.horarioVenta)
  reservas!: Reserva[];
}
