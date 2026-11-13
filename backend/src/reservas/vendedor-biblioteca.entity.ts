import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../auth/usuario.entity';
import { HorarioVenta } from './horario-venta.entity';

@Entity('vendedores_biblioteca')
export class VendedorBiblioteca {
  @PrimaryGeneratedColumn({ name: 'id_vendedor' })
  idVendedor!: number;

  @Column({ type: 'varchar', length: 80 })
  nombre!: string;

  @OneToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uid' })
  usuario!: Usuario | null;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn({
    name: 'fecha_creacion',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaCreacion!: Date;

  @OneToMany(() => HorarioVenta, (horario) => horario.vendedor)
  horarios!: HorarioVenta[];
}
