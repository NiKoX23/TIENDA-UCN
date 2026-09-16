import { api } from './api';
import type { Producto } from '../productos/Productos';

export async function listarProductos(): Promise<Producto[]> {
	const { data } = await api.get<Producto[]>('/productos');
	return data;
}

export async function comprarProductos(
	lineas: Array<{ codigoProducto: string; cantidad: number }>,
) {
	const { data } = await api.post<{ total: number; numeroDocumento: string }>('/productos/comprar', {
		metodoPago: 'pendiente',
		lineas,
	});
	return data;
}
