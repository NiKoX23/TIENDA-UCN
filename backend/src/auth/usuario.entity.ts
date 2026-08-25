import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('usuarios')
export class Usuario {
    @PrimaryGeneratedColumn({ name: 'uid' })
    uid!: number;

    @Column({ type: 'varchar', length: 50 })
    nombre!: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    email!: string;

    @Column({ type: 'varchar', length: 60, name: 'password_hash', nullable: true })
    passwordHash!: string | null;

    @Column({ type: 'varchar', length: 50, name: 'google_id', nullable: true, unique: true })
    googleId!: string | null;

    @Column({ type: 'varchar', length: 20, name: 'proveedor_auth', default: 'local' })
    proveedorAuth!: string;

    @Column({ type: 'boolean', name: 'es_admin', default: false })
    esAdmin!: boolean;

    @CreateDateColumn({ name: 'fecha_registro' })
    fechaRegistro!: Date;
}