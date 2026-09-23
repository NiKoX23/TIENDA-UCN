import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn({ name: 'id_cliente' })
  idCliente!: number;

  @Column({ type: 'integer', unique: true, nullable: true })
  uid!: number | null;

  @Column({ type: 'varchar', length: 50 })
  nombre!: string;

  @Column({ type: 'varchar', length: 15, nullable: true, unique: true })
  rut!: string | null;

  @Column({ type: 'varchar', length: 100, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  direccion!: string | null;
}
