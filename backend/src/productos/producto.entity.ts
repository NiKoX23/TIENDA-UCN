import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { Categoria } from './categoria.entity';
import { VarianteProducto } from './variante-producto.entity';

@Entity('productos')
export class Producto {
  @PrimaryColumn({ name: 'codigo_producto', type: 'varchar', length: 15 })
  codigoProducto!: string;

  @ManyToOne(() => Categoria, (categoria) => categoria.productos, {
    nullable: false,
  })
  @JoinColumn({ name: 'id_categoria' })
  categoria!: Categoria;

  @Column({ type: 'varchar', length: 50 })
  nombre!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  descripcion!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  marca!: string | null;

  @Column({ name: 'costo_adquisicion', type: 'integer' })
  costoAdquisicion!: number;

  @Column({ name: 'precio_venta', type: 'integer' })
  precioVenta!: number;

  @Column({ name: 'precio_tac', type: 'integer', nullable: true })
  precioTac!: number | null;

  @Column({ name: 'imagen_url', type: 'varchar', length: 200, nullable: true })
  imagenUrl!: string | null;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @OneToMany(() => VarianteProducto, (variante) => variante.producto)
  variantes!: VarianteProducto[];
}
