import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArchivosService } from './archivos.service';

describe('ArchivosService', () => {
  const clave = '0123456789abcdef'.repeat(4);
  const configuracion = {
    extensiones_permitidas: 'png,jpeg,pdf',
    max_size: '1',
    FILE_ENCRYPTION_KEY: clave,
  };
  const service = new ArchivosService({
    get: (nombre: string) =>
      configuracion[nombre as keyof typeof configuracion],
  } as ConfigService);

  it('cifra y descifra un PDF sin guardar su contenido en claro', () => {
    const pdf = Buffer.from('%PDF-1.7 contenido de prueba');
    const cifrado = service.cifrarPdf({
      originalname: 'documento.pdf',
      mimetype: 'application/pdf',
      size: pdf.length,
      buffer: pdf,
    });

    expect(cifrado.includes(pdf)).toBe(false);
    expect(service.descifrarPdf(cifrado)).toEqual(pdf);
  });

  it('rechaza extensiones y contenido de archivo no permitidos', () => {
    expect(() =>
      service.validarArchivo(
        {
          originalname: 'documento.exe',
          mimetype: 'application/pdf',
          size: 10,
          buffer: Buffer.from('%PDF-1.7'),
        },
        'pdf',
      ),
    ).toThrow(BadRequestException);

    expect(() =>
      service.validarArchivo(
        {
          originalname: 'documento.pdf',
          mimetype: 'application/pdf',
          size: 10,
          buffer: Buffer.from('no es un PDF'),
        },
        'pdf',
      ),
    ).toThrow('El contenido del archivo no coincide con su extensión.');
  });

  it('rechaza archivos que superan max_size', () => {
    expect(() =>
      service.validarArchivo(
        {
          originalname: 'documento.pdf',
          mimetype: 'application/pdf',
          size: 1024 * 1024 + 1,
          buffer: Buffer.from('%PDF-1.7'),
        },
        'pdf',
      ),
    ).toThrow('El archivo supera el tamaño máximo permitido de 1 MB.');
  });
});
