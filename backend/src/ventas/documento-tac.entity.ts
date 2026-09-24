import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VarianteProducto } from '../productos/variante-producto.entity';

export type FirmaEstado = 'Firmado' | 'Pendiente' | 'Rechazado';

@Entity('documentos_tac')
export class DocumentoTac {
  @PrimaryGeneratedColumn({ name: 'id_tac' })
  idTac!: number;

  @Column({ name: 'n_tac', type: 'varchar', length: 30 })
  nTac!: string;

  @CreateDateColumn({ type: 'timestamp' })
  fecha!: Date;

  @ManyToOne(() => VarianteProducto, { nullable: false })
  @JoinColumn({ name: 'id_variante' })
  variante!: VarianteProducto;

  @Column({ type: 'integer' })
  cantidad!: number;

  @Column({ name: 'precio_tac', type: 'integer' })
  precioTac!: number;

  @Column({ type: 'integer' })
  total!: number;

  @Column({
    name: 'firma_comprador',
    type: 'varchar',
    length: 10,
    default: 'Pendiente',
  })
  firmaComprador!: FirmaEstado;

  @Column({
    name: 'firma_vendedor',
    type: 'varchar',
    length: 10,
    default: 'Pendiente',
  })
  firmaVendedor!: FirmaEstado;
}
