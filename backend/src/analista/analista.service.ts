import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

type AnalyticsEndpoint = 'ingresos' | 'prediccion' | 'resumen';

@Injectable()
export class AnalistaService {
  private readonly url: string;

  constructor(config: ConfigService) {
    this.url = (config.get<string>('ANALITICA_URL') ?? 'http://localhost:8000')
      .replace(/\/+$/, '');
  }

  async consultar(
    endpoint: AnalyticsEndpoint,
    query: Record<string, string | undefined>,
    request: Request,
  ): Promise<unknown> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params.set(key, value);
    }

    const token = request.headers.authorization;
    const cookie = request.headers.cookie;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = token;
    if (cookie) headers.Cookie = cookie;

    const control = new AbortController();
    const timeout = setTimeout(() => control.abort(), 10_000);
    try {
      const suffix = params.size ? `?${params.toString()}` : '';
      const response = await fetch(
        `${this.url}/analytics/${endpoint}${suffix}`,
        { headers, signal: control.signal },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new HttpException(
          body ?? { detail: 'El servicio de analítica rechazó la solicitud' },
          response.status,
        );
      }
      return body;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        `No se pudo consultar el servicio de analítica: ${(error as Error).message}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
