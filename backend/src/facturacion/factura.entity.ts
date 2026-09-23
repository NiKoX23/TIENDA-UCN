import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cliente } from '../clientes/cliente.entity';

@Entity('facturas')
export class Factura {
  @PrimaryGeneratedColumn({ name: 'id_factura' })
  idFactura!: number;

  @ManyToOne(() => Cliente, { nullable: false })
  @JoinColumn({ name: 'id_cliente' })
  cliente!: Cliente;

  @Column({ name: 'tipo_documento', type: 'varchar', length: 10 })
  tipoDocumento!: string;

  @Column({
    name: 'numero_documento',
    type: 'varchar',
    length: 20,
    unique: true,
  })
  numeroDocumento!: string;

  @Column({
    name: 'rut_facturacion',
    type: 'varchar',
    length: 15,
    nullable: true,
  })
  rutFacturacion!: string | null;

  @Column({
    name: 'razon_social',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  razonSocial!: string | null;

  @Column({ name: 'metodo_pago', type: 'varchar', length: 30 })
  metodoPago!: string;

  @CreateDateColumn({ type: 'timestamp' })
  fecha!: Date;

  @Column({ type: 'integer' })
  total!: number;
}
