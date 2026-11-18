import { IsIn } from 'class-validator';

export type RolUsuario = 'usuario' | 'vendedor' | 'admin';

export class AdminRolDto {
  @IsIn(['usuario', 'vendedor', 'admin'], {
    message: 'role debe ser usuario, vendedor o admin',
  })
  role!: RolUsuario;
}
