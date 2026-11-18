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
    responsable: string | null;
    firmaComprador: FirmaEstado;
    firmaVendedor: FirmaEstado;
    estado: EstadoTac;
    tieneVenta: boolean;
    tieneArchivoPdf: boolean;
}

export interface PayloadDocumentoTac {
    nTac?: string;
    fecha?: string;
    sku?: string;
    cantidad?: number;
    precioTac?: number;
    responsable?: string;
    firmaComprador?: FirmaEstado;
    firmaVendedor?: FirmaEstado;
}

export interface PayloadRegistrarVenta {
    fecha?: string;
    sku: string;
    cantidad: number;
    metodoPago: string;
    tipoVenta: TipoVenta;
    idVendedor?: number;
    numeroTac?: string;
    observaciones?: string;
}

export interface VendedorVenta {
    idVendedor: number;
    nombre: string;
    email: string;
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

export async function buscarVendedoresVenta(q: string): Promise<VendedorVenta[]> {
    const { data } = await api.get<VendedorVenta[]>('/ventas/admin/vendedores', {
      params: { q },
    });
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

function crearFormularioDocumento(payload: PayloadDocumentoTac, archivo?: File): FormData {
    const formulario = new FormData();
    Object.entries(payload).forEach(([clave, valor]) => {
        if (valor !== undefined) formulario.append(clave, String(valor));
    });
    if (archivo) formulario.append('archivo', archivo);
    return formulario;
}

export async function crearDocumentoTac(payload: PayloadDocumentoTac, archivo: File): Promise<DocumentoTac> {
    const { data } = await api.post<DocumentoTac>(
        '/ventas/admin/tac',
        crearFormularioDocumento(payload, archivo),
    );
    return data;
}

export async function actualizarDocumentoTac(
    idTac: number,
    payload: PayloadDocumentoTac,
    archivo?: File,
): Promise<DocumentoTac> {
    const { data } = await api.patch<DocumentoTac>(
        `/ventas/admin/tac/${idTac}`,
        archivo ? crearFormularioDocumento(payload, archivo) : payload,
    );
    return data;
}

export async function eliminarDocumentoTac(idTac: number): Promise<void> {
    await api.delete(`/ventas/admin/tac/${idTac}`);
}

export function urlArchivoDocumentoTac(idTac: number): string {
    return api.getUri({ url: `/ventas/admin/tac/${idTac}/archivo` });
}