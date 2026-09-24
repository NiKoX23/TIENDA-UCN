import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class VarianteDto {
  @IsString()
  @MaxLength(10)
  talla!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  color?: string;

  @IsString()
  @MaxLength(20)
  sku!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock: number = 0;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockMinimo: number = 0;
}

export class CrearProductoDto {
  @IsString()
  @MaxLength(15)
  codigoProducto!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idCategoria!: number;

  @IsString()
  @MaxLength(50)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  marca?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  costoAdquisicion!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  precioVenta!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  precioTac?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  imagenUrl?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ValidateNested()
  @Type(() => VarianteDto)
  variante!: VarianteDto;
}

export class ActualizarProductoDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idCategoria?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  marca?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  costoAdquisicion?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  precioVenta?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  precioTac?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  imagenUrl?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class AjustarStockDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock!: number;
}
