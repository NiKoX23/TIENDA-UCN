import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @IsEmail({}, { message: 'Correo electrónico inválido' })
    email!: string;

    @IsString()
    @MinLength(6)
    password!: string;
}