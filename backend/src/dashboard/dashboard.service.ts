import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ResumenDashboard } from './resumen.types';

@Injectable()
export class DashboardService {
  private readonly url: string;

  constructor(config: ConfigService) {
    this.url = config.get<string>('ANALITICA_URL') ?? 'http://localhost:8000';
  }

  async obtenerResumen(): Promise<ResumenDashboard> {
    const control = new AbortController();
    const timeout = setTimeout(() => control.abort(), 5000);
    try {
      const response = await fetch(`${this.url}/resumen`, {
        signal: control.signal,
      });
      if (!response.ok) {
        throw new Error(`analitica respondió ${response.status}`);
      }
      return (await response.json()) as ResumenDashboard;
    } catch (error) {
      throw new ServiceUnavailableException(
        `No se pudo obtener el resumen desde el servicio de analítica: ${
          (error as Error).message
        }`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
