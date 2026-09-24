import { api } from './api';

export type EstadoInventario = 'CRITICO' | 'BAJO' | 'NORMAL' | 'ALTO';

export interface ItemInventario {
    codigoProducto: string;
    nombre: string;
    marca: string | null;
    categoria: string;
    talla: string;
    color: string | null;
    sku: string;
    activo: boolean;
    costoAdquisicion: number;
    precioVenta: number;
    precioTac: number;
    stock: number;
    stockMinimo: number;
    vendidas: number;
    inicial: number;
    margen: number;
    ingresoVenta: number;
    ingresoTac: number;
    estado: EstadoInventario;
}

export interface CategoriaOpcion {
    idCategoria: number;
    nombre: string;
}

export interface VariantePayload {
    talla: string;
    color?: string;
    sku: string;
    stock: number;
    stockMinimo: number;
}

export interface NuevoProductoPayload {
    codigoProducto: string;
    idCategoria: number;
    nombre: string;
    descripcion?: string;
    marca?: string;
    costoAdquisicion: number;
    precioVenta: number;
    precioTac?: number;
    imagenUrl?: string;
    activo?: boolean;
    variante: VariantePayload;
}

export type ActualizarProductoPayload = Partial<Omit<NuevoProductoPayload, 'codigoProducto' | 'variante'>>;

export async function listarInventario(): Promise<ItemInventario[]> {
    const { data } = await api.get<ItemInventario[]>('/productos/admin/inventario');
    return data;
}

export async function listarCategorias(): Promise<CategoriaOpcion[]> {
    const { data } = await api.get<CategoriaOpcion[]>('/productos/categorias');
    return data;
}

export async function ajustarStock(sku: string, stock: number): Promise<{ sku: string; stock: number }> {
    const { data } = await api.patch(`/productos/admin/inventario/${encodeURIComponent(sku)}/stock`, { stock });
    return data;
}

export async function crearProducto(payload: NuevoProductoPayload): Promise<{ codigoProducto: string; nombre: string }> {
    const { data } = await api.post('/productos/admin/inventario', payload);
    return data;
}

export async function actualizarProducto(
    codigoProducto: string,
    payload: ActualizarProductoPayload,
): Promise<{ codigoProducto: string; nombre: string; activo: boolean }> {
    const { data } = await api.patch(`/productos/admin/inventario/${encodeURIComponent(codigoProducto)}`, payload);
    return data;
}

export async function agregarVariante(codigoProducto: string, payload: VariantePayload): Promise<{ idVariante: number; sku: string; stock: number }> {
    const { data } = await api.post(`/productos/admin/inventario/${encodeURIComponent(codigoProducto)}/variantes`, payload);
    return data;
}