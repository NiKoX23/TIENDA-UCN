import { IsDateString, IsIn, IsOptional, Matches } from 'class-validator';
import { PaginacionQueryDto } from '../../common/paginacion';

export const ORDENES_BOLETA = [
  'fecha-desc',
  'fecha-asc',
  'subtotal',
  'cantidad',
  'producto',
] as const;
export type OrdenBoleta = (typeof ORDENES_BOLETA)[number];

/** Historial de ventas agrupado por boleta. `q` busca en boleta, producto, SKU, talla, color y N° TAC. */
export class ListarBoletasQueryDto extends PaginacionQueryDto {
  @IsOptional()
  @IsIn(['todos', 'normal', 'tac'])
  tipo?: 'todos' | 'normal' | 'tac';

  @IsOptional()
  @IsIn([...ORDENES_BOLETA])
  orden?: OrdenBoleta;

  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  desde?: string;

  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  hasta?: string;
}

export const ORDENES_TAC = ['fecha-desc', 'fecha-asc', 'total', 'producto'] as const;
export type OrdenTac = (typeof ORDENES_TAC)[number];

/** Documentos TAC. `q` busca en N° TAC, producto, código, SKU, talla, color y responsable. */
export class ListarTacQueryDto extends PaginacionQueryDto {
  @IsOptional()
  @IsIn(['todos', 'Aprobado', 'Pendiente', 'Rechazado'])
  estado?: 'todos' | 'Aprobado' | 'Pendiente' | 'Rechazado';

  @IsOptional()
  @IsIn([...ORDENES_TAC])
  orden?: OrdenTac;
}
