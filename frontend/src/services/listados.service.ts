import { api } from './api';
import type { PaginaApi } from './paginacion';
import type { DocumentoTac, EstadoTac, RegistroVentaItem, TipoVenta } from './ventas.service';
import type { AdminUsuario } from './admin.service';

// ---------- Ventas por boleta ----------
export interface BoletaVenta {
    idFactura: number;
    numeroDocumento: string;
    fecha: string;
    tipoVenta: TipoVenta;
    metodoPago: string;
    observaciones: string | null;
    numeroTac: string | null;
    tacAprobado: 'Si' | 'Pendiente' | 'No' | null;
    unidades: number;
    subtotal: number;
    ganancia: number;
    lineas: RegistroVentaItem[];
}

export type OrdenBoleta = 'fecha-desc' | 'fecha-asc' | 'subtotal' | 'cantidad' | 'producto';

export interface ParametrosBoletas {
    page: number;
    limit: number;
    q?: string;
    tipo?: 'todos' | TipoVenta;
    orden?: OrdenBoleta;
    desde?: string;
    hasta?: string;
}

export async function listarBoletas(params: ParametrosBoletas): Promise<PaginaApi<BoletaVenta>> {
    const { data } = await api.get<PaginaApi<BoletaVenta>>('/ventas/admin/registro', { params });
    return data;
}

export async function listarMisVentas(params: ParametrosBoletas): Promise<PaginaApi<BoletaVenta>> {
    const { data } = await api.get<PaginaApi<BoletaVenta>>('/ventas/vendedor/registro', { params });
    return data;
}

export interface TotalesVentas {
    boletas: number;
    cantidad: number;
    subtotal: number;
    ganancia: number;
}

export async function obtenerTotalesVentas(): Promise<TotalesVentas> {
    const { data } = await api.get<TotalesVentas>('/ventas/admin/registro/totales');
    return data;
}

// ---------- Documentos TAC ----------
export type OrdenTac = 'fecha-desc' | 'fecha-asc' | 'total' | 'producto';

export interface ParametrosTac {
    page: number;
    limit: number;
    q?: string;
    estado?: 'todos' | EstadoTac;
    orden?: OrdenTac;
}

export async function listarDocumentosTacPaginado(params: ParametrosTac): Promise<PaginaApi<DocumentoTac>> {
    const { data } = await api.get<PaginaApi<DocumentoTac>>('/ventas/admin/tac', { params });
    return data;
}

export interface ResumenTac {
    total: number;
    monto: number;
    aprobados: number;
    pendientes: number;
    rechazados: number;
}

export async function obtenerResumenTac(): Promise<ResumenTac> {
    const { data } = await api.get<ResumenTac>('/ventas/admin/tac/resumen');
    return data;
}

// ---------- Usuarios ----------
export interface ParametrosUsuarios {
    page: number;
    limit: number;
    q?: string;
    rol?: 'admin' | 'usuario';
}

export async function listarUsuariosPaginado(params: ParametrosUsuarios): Promise<PaginaApi<AdminUsuario>> {
    const { data } = await api.get<PaginaApi<AdminUsuario>>('/auth/admin/usuarios', { params });
    return data;
}
