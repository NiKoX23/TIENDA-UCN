import axios from 'axios';

export function mensajeErrorApi(error: unknown, alternativa: string): string {
  if (axios.isAxiosError(error)) {
    const mensaje = (error.response?.data as { message?: string | string[] } | undefined)
      ?.message;
    if (Array.isArray(mensaje)) return mensaje.join(', ');
    if (mensaje) return mensaje;
    if (!error.response) return error.message;
  } else if (error instanceof Error) {
    return error.message;
  }
  return alternativa;
}
