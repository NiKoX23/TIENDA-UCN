import { api } from './api';

export type TipoVenta = 'normal' | 'tac';
export type FirmaEstado = 'Firmado' | 'Pendiente' | 'Rechazado';
export type EstadoTac = 'Aprobado' | 'Pendiente' | 'Rechazado';

export interface RegistroVentaItem {
    idSalida: number;
    idFactura: number;
    numeroDocumento: string;
    fecha: string;
    producto: string;
    codigoProducto: string;
    sku: string;
    talla: string;
    color: string | null;
    cantidad: number;
    metodoPago: string;
    tipoVenta: TipoVenta;
    numeroTac: string | null;
    tacAprobado: 'Si' | 'Pendiente' | 'No' | null;
    precioUnitarioAplicado: number;
    subtotal: number;
    gananciaUnitaria: number;
    gananciaTotal: number;
    observaciones: string | null;
}

export interface DocumentoTac {
    idTac: number;
    nTac: string;
    fecha: string;
    producto: string;
    codigoProducto: string;
    sku: string;
    talla: string;
    color: string | null;
    cantidad: number;
    precioTac: number;
    total: number;
    firmaComprador: FirmaEstado;
    firmaVendedor: FirmaEstado;
    estado: EstadoTac;
}

export interface PayloadRegistrarVenta {
    fecha?: string;
    sku: string;
    cantidad: number;
    metodoPago: string;
    tipoVenta: TipoVenta;
    numeroTac?: string;
    observaciones?: string;
}

export interface PayloadFirmas {
    firmaComprador?: FirmaEstado;
    firmaVendedor?: FirmaEstado;
}

export interface ResultadoRegistroVenta {
    idFactura: number;
    numeroDocumento: string;
    tipoVenta: TipoVenta;
    total: number;
}

export async function listarRegistroVentas(): Promise<RegistroVentaItem[]> {
    const { data } = await api.get<RegistroVentaItem[]>('/ventas/admin/registro');
    return data;
}

export async function registrarVenta(payload: PayloadRegistrarVenta): Promise<ResultadoRegistroVenta> {
    const { data } = await api.post<ResultadoRegistroVenta>('/ventas/admin/registro', payload);
    return data;
}

export async function listarDocumentosTac(): Promise<DocumentoTac[]> {
    const { data } = await api.get<DocumentoTac[]>('/ventas/admin/tac');
    return data;
}

export async function actualizarFirmas(idTac: number, payload: PayloadFirmas): Promise<DocumentoTac> {
    const { data } = await api.patch<DocumentoTac>(`/ventas/admin/tac/${idTac}/firmas`, payload);
    return data;
}