import { IsBoolean } from 'class-validator';

export class AdminRolDto {
  @IsBoolean({ message: 'esAdmin debe ser un valor booleano' })
  esAdmin!: boolean;
}
