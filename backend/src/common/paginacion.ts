import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const LIMITE_MAXIMO = 100;
export const LIMITE_POR_DEFECTO = 100;

/**
 * Parámetros comunes de listados paginados.
 * Compatibilidad: si NO se envía `page`, el endpoint responde sin paginar
 * (arreglo completo, como antes), de modo que el frontend anterior sigue funcionando.
 */
export class PaginacionQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LIMITE_MAXIMO)
  limit?: number;

  /** Texto de búsqueda libre (cada endpoint define en qué campos busca). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export interface Pagina<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function crearPagina<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): Pagina<T> {
  return { data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export function resolverPagina(query: PaginacionQueryDto) {
  const page = query.page ?? 1;
  const limit = query.limit ?? LIMITE_POR_DEFECTO;
  return { page, limit, offset: (page - 1) * limit };
}

/** Convierte el texto del usuario en un patrón ILIKE literal (escapa \ % _). Null si está vacío. */
export function patronBusqueda(q?: string): string | null {
  const texto = q?.trim();
  if (!texto) return null;
  return `%${texto.replace(/[\\%_]/g, '\\$&')}%`;
}
