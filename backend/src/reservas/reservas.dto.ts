import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { EstadoReserva } from './estado-reserva.enum';

export class LineaReservaDto {
  @IsInt()
  @Min(1)
  idVariante!: number;

  @IsInt()
  @Min(1)
  @Max(1000)
  cantidad!: number;
}

export class CrearReservaDto {
  @IsDateString()
  fechaRetiro!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  bloqueHorario?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => LineaReservaDto)
  lineas!: LineaReservaDto[];
}

export class ActualizarEstadoReservaDto {
  @IsIn(Object.values(EstadoReserva))
  estado!: EstadoReserva;
}
