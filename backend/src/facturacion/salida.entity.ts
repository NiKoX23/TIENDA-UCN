import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Factura } from './factura.entity';
import { VarianteProducto } from '../productos/variante-producto.entity';

@Entity('salidas')
export class Salida {
  @PrimaryGeneratedColumn({ name: 'id_salida' })
  idSalida!: number;

  @ManyToOne(() => Factura, { nullable: false })
  @JoinColumn({ name: 'id_factura' })
  factura!: Factura;

  @ManyToOne(() => VarianteProducto, { nullable: false })
  @JoinColumn({ name: 'id_variante' })
  variante!: VarianteProducto;

  @Column({ type: 'integer' })
  cantidad!: number;

  @Column({ name: 'precio_unitario', type: 'integer' })
  precioUnitario!: number;

  @Column({ type: 'integer' })
  subtotal!: number;
}