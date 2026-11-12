import { IsIn, IsOptional } from 'class-validator';
import { PaginacionQueryDto } from '../../common/paginacion';

export class ListarUsuariosQueryDto extends PaginacionQueryDto {
  /** Filtra por rol. Sin valor, devuelve todos. */
  @IsOptional()
  @IsIn(['admin', 'usuario'])
  rol?: 'admin' | 'usuario';
}
