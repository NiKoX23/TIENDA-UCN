import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export type TipoVentaDto = 'normal' | 'tac';
export type FirmaEstadoDto = 'Firmado' | 'Pendiente' | 'Rechazado';

export class RegistrarVentaDto {
  @IsOptional()
  @IsISO8601()
  fecha?: string;

  @IsString()
  @MaxLength(20)
  sku!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsPositive()
  cantidad!: number;

  @IsString()
  @MaxLength(30)
  metodoPago!: string;

  @IsIn(['normal', 'tac'])
  tipoVenta!: TipoVentaDto;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  numeroTac?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  observaciones?: string;
}

export class FirmasDto {
  @IsOptional()
  @IsIn(['Firmado', 'Pendiente', 'Rechazado'])
  firmaComprador?: FirmaEstadoDto;

  @IsOptional()
  @IsIn(['Firmado', 'Pendiente', 'Rechazado'])
  firmaVendedor?: FirmaEstadoDto;
}

export class CrearDocumentoTacDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  nTac?: string;

  @IsOptional()
  @IsISO8601()
  fecha?: string;

  @IsString()
  @MaxLength(20)
  sku!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  precioTac?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  responsable?: string;

  @IsOptional()
  @IsIn(['Firmado', 'Pendiente', 'Rechazado'])
  firmaComprador?: FirmaEstadoDto;

  @IsOptional()
  @IsIn(['Firmado', 'Pendiente', 'Rechazado'])
  firmaVendedor?: FirmaEstadoDto;
}

export class ActualizarDocumentoTacDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  nTac?: string;

  @IsOptional()
  @IsISO8601()
  fecha?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  sku?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  precioTac?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  responsable?: string;

  @IsOptional()
  @IsIn(['Firmado', 'Pendiente', 'Rechazado'])
  firmaComprador?: FirmaEstadoDto;

  @IsOptional()
  @IsIn(['Firmado', 'Pendiente', 'Rechazado'])
  firmaVendedor?: FirmaEstadoDto;
}
