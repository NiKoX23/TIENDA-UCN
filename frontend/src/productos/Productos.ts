export interface Producto {
  codigoProducto: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  precio: number;
  precioTac: number | null;
  imagen: string;
  idVariante: number;
  talla: string;
  color: string | null;
  sku: string;
  stock: number;
}

export const categorias = [
  { id: 'todos', label: 'todos' },
  { id: 'polerones', label: 'polerones' },
  { id: 'accesorios', label: 'accesorios' },
  { id: 'papeleria', label: 'papelería' },
] as const;
