import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Producto } from './producto.entity';

@Entity('variantes_producto')
export class VarianteProducto {
  @PrimaryGeneratedColumn({ name: 'id_variante' })
  idVariante!: number;

  @ManyToOne(() => Producto, (producto) => producto.variantes, { nullable: false })
  @JoinColumn({ name: 'codigo_producto', referencedColumnName: 'codigoProducto' })
  producto!: Producto;

  @Column({ type: 'varchar', length: 10 })
  talla!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  color!: string | null;

  @Column({ type: 'varchar', length: 20, unique: true })
  sku!: string;

  @Column({ type: 'integer', default: 0 })
  stock!: number;

  @Column({ name: 'stock_minimo', type: 'integer', default: 0 })
  stockMinimo!: number;
}