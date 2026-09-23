import { Type } from 'class-transformer';
import { IsInt, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class LineaCompraDto {
  @IsString()
  @MaxLength(15)
  codigoProducto!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsPositive()
  cantidad!: number;
}

export class CrearCompraDto {
  @IsString()
  @MaxLength(30)
  metodoPago = 'pendiente';

  lineas!: LineaCompraDto[];
}
