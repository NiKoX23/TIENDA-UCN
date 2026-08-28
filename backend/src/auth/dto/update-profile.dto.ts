import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
    @IsString()
    @MinLength(2)
    @MaxLength(50)
    nombre!: string;

    @IsEmail({}, { message: 'Correo electrónico inválido' })
    email!: string;

    @IsOptional()
    @IsString()
    @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
    password?: string;
}