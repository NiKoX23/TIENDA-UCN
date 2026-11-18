import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ArchivoSubido, ConfiguracionArchivos } from './archivos.types';

const MIME_POR_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  pdf: 'application/pdf',
};
const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const FIRMA_PDF = Buffer.from('%PDF-');
const TAMANO_IV = 12;
const TAMANO_TAG = 16;

export function leerConfiguracionArchivos(
  config: ConfigService,
): ConfiguracionArchivos {
  const extensiones = config.get<string>('extensiones_permitidas');
  const maxSizeMB = Number(config.get<string>('max_size'));
  const permitidas = (extensiones ?? '')
    .split(',')
    .map((extension) => extension.trim().toLowerCase())
    .filter(Boolean);

  if (
    permitidas.length === 0 ||
    permitidas.some(
      (extension) => !Object.hasOwn(MIME_POR_EXTENSION, extension),
    )
  ) {
    throw new InternalServerErrorException(
      'extensiones_permitidas debe contener png, jpeg y/o pdf.',
    );
  }
  if (!Number.isFinite(maxSizeMB) || maxSizeMB <= 0) {
    throw new InternalServerErrorException(
      'max_size debe ser un número mayor que 0, expresado en megabytes.',
    );
  }

  return { extensionesPermitidas: [...new Set(permitidas)], maxSizeMB };
}

@Injectable()
export class ArchivosService {
  constructor(private readonly config: ConfigService) {}

  obtenerConfiguracion(): ConfiguracionArchivos {
    return leerConfiguracionArchivos(this.config);
  }

  validarArchivo(
    archivo: ArchivoSubido | undefined,
    tipo: 'imagen' | 'pdf',
  ): ArchivoSubido {
    if (!archivo) {
      throw new BadRequestException('Selecciona un archivo para continuar.');
    }

    const { extensionesPermitidas, maxSizeMB } = this.obtenerConfiguracion();
    const extensionOriginal = archivo.originalname
      .split('.')
      .pop()
      ?.toLowerCase();
    const extension = extensionOriginal === 'jpg' ? 'jpeg' : extensionOriginal;
    const permitidasParaTipo =
      tipo === 'imagen'
        ? extensionesPermitidas.filter((valor) =>
            ['png', 'jpeg'].includes(valor),
          )
        : extensionesPermitidas.filter((valor) => valor === 'pdf');

    if (
      !extension ||
      !permitidasParaTipo.includes(extension) ||
      !MIME_POR_EXTENSION[extension]
    ) {
      throw new BadRequestException(
        tipo === 'imagen'
          ? 'Tipo de archivo no permitido. Sube una imagen PNG o JPEG.'
          : 'Tipo de archivo no permitido. Sube un documento PDF.',
      );
    }

    if (archivo.mimetype !== MIME_POR_EXTENSION[extension]) {
      throw new BadRequestException(
        'El contenido del archivo no coincide con su extensión.',
      );
    }

    const tamanoMaximo = maxSizeMB * 1024 * 1024;
    if (archivo.size > tamanoMaximo) {
      throw new BadRequestException(
        `El archivo supera el tamaño máximo permitido de ${maxSizeMB} MB.`,
      );
    }
    if (archivo.size === 0) {
      throw new BadRequestException('El archivo está vacío.');
    }

    const firmaValida =
      extension === 'png'
        ? archivo.buffer.subarray(0, FIRMA_PNG.length).equals(FIRMA_PNG)
        : extension === 'jpeg'
          ? archivo.buffer[0] === 0xff && archivo.buffer[1] === 0xd8
          : archivo.buffer.subarray(0, FIRMA_PDF.length).equals(FIRMA_PDF);
    if (!firmaValida) {
      throw new BadRequestException(
        'El contenido del archivo no coincide con su extensión.',
      );
    }

    return archivo;
  }

  async guardarImagen(archivo: ArchivoSubido): Promise<string> {
    this.validarArchivo(archivo, 'imagen');
    const extension = archivo.originalname.split('.').pop()?.toLowerCase();
    const extensionFinal =
      extension === 'jpg' || extension === 'jpeg' ? 'jpg' : 'png';
    const nombre = `${randomUUID()}.${extensionFinal}`;
    const directorio = this.obtenerDirectorioProductos();
    await mkdir(directorio, { recursive: true });
    await writeFile(resolve(directorio, nombre), archivo.buffer, {
      flag: 'wx',
    });
    return `/productos/${nombre}`;
  }

  async eliminarImagen(url: string): Promise<void> {
    const nombre = url.split('/').pop();
    if (!nombre || !/^[0-9a-f-]+\.(png|jpg)$/.test(nombre)) return;

    try {
      await unlink(resolve(this.obtenerDirectorioProductos(), nombre));
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return;
      }
      throw error;
    }
  }

  cifrarPdf(archivo: ArchivoSubido): Buffer {
    this.validarArchivo(archivo, 'pdf');
    const key = this.obtenerClaveCifrado();
    const iv = randomBytes(TAMANO_IV);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const cifrado = Buffer.concat([
      cipher.update(archivo.buffer),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), cifrado]);
  }

  descifrarPdf(archivoCifrado: Buffer): Buffer {
    if (archivoCifrado.length <= TAMANO_IV + TAMANO_TAG) {
      throw new InternalServerErrorException(
        'El archivo TAC almacenado está dañado.',
      );
    }

    const key = this.obtenerClaveCifrado();
    const iv = archivoCifrado.subarray(0, TAMANO_IV);
    const authTag = archivoCifrado.subarray(TAMANO_IV, TAMANO_IV + TAMANO_TAG);
    const contenido = archivoCifrado.subarray(TAMANO_IV + TAMANO_TAG);

    try {
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(contenido), decipher.final()]);
    } catch {
      throw new InternalServerErrorException(
        'No se pudo descifrar el documento TAC. Verifica FILE_ENCRYPTION_KEY.',
      );
    }
  }

  private obtenerClaveCifrado(): Buffer {
    const clave = this.config.get<string>('FILE_ENCRYPTION_KEY');
    if (!clave || !/^[a-f\d]{64}$/i.test(clave)) {
      throw new InternalServerErrorException(
        'FILE_ENCRYPTION_KEY debe contener 64 caracteres hexadecimales (32 bytes).',
      );
    }
    return Buffer.from(clave, 'hex');
  }

  private obtenerDirectorioProductos(): string {
    return (
      this.config.get<string>('PRODUCTOS_UPLOAD_DIR') ??
      resolve(__dirname, '..', '..', '..', 'frontend', 'public', 'productos')
    );
  }
}
