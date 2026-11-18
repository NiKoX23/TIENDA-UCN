export interface ArchivoSubido {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface ConfiguracionArchivos {
  extensionesPermitidas: string[];
  maxSizeMB: number;
}
