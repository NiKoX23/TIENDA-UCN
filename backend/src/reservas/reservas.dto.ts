import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsBoolean,
  IsIn,
  IsInt,
  MinLength,
  Matches,
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

  @IsInt()
  @Min(1)
  idHorario!: number;

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

export class CrearVendedorBibliotecaDto {
  @IsInt()
  @Min(1)
  uidUsuario!: number;
}

export class BuscarUsuariosVendedoresQueryDto {
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    return value.replace(/\s+/g, ' ').trim();
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  q!: string;
}

export class CrearHorarioVentaDto {
  @IsInt()
  @Min(1)
  idVendedor!: number;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha!: string;

  @IsString()
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
  horaInicio!: string;

  @IsString()
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
  horaTermino!: string;
}

export class ActualizarDisponibilidadHorarioDto {
  @IsBoolean()
  activo!: boolean;
}

export class ActualizarEstadoReservaDto {
  @IsIn(Object.values(EstadoReserva))
  estado!: EstadoReserva;
}
