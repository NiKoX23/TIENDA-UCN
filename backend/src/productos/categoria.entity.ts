import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Producto } from './producto.entity';

@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn({ name: 'id_categoria' })
  idCategoria!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  nombre!: string;

  @OneToMany(() => Producto, (producto) => producto.categoria)
  productos!: Producto[];
}