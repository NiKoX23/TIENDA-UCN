import { api } from './api';

export interface ConfiguracionArchivos {
    extensionesPermitidas: string[];
    maxSizeMB: number;
}

export async function obtenerConfiguracionArchivos(): Promise<ConfiguracionArchivos> {
    const { data } = await api.get<ConfiguracionArchivos>('/archivos/config');
    return data;
}
