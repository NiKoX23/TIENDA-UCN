export interface Talla {
  nombre: string;
  disponible: boolean;
}

export interface Producto {
  nombre: string;
  categoria: 'poleras' | 'polerones' | 'pantalones' | 'accesorios';
  precio: string;
  etiqueta?: 'descuento' | 'nuevo';
  etiquetaTexto?: string;
  tallas: Talla[];
}

export const productos: Producto[] = [
  {
    nombre: 'Polerón Oversize',
    categoria: 'polerones',
    precio: '$19.990',
    etiqueta: 'descuento',
    etiquetaTexto: '-20%',
    tallas: [
      { nombre: 'S', disponible: true },
      { nombre: 'M', disponible: true },
      { nombre: 'L', disponible: false },
    ],
  },
  {
    nombre: 'Polera Básica',
    categoria: 'poleras',
    precio: '$8.990',
    tallas: [
      { nombre: 'M', disponible: true },
      { nombre: 'L', disponible: true },
      { nombre: 'XL', disponible: true },
    ],
  },
  {
    nombre: 'Mochila Urbana',
    categoria: 'accesorios',
    precio: '$24.990',
    etiqueta: 'nuevo',
    etiquetaTexto: 'nuevo',
    tallas: [{ nombre: 'única', disponible: true }],
  },
];

export const categorias = [
  { id: 'todos', label: 'todos' },
  { id: 'poleras', label: 'poleras' },
  { id: 'polerones', label: 'polerones' },
  { id: 'pantalones', label: 'pantalones' },
  { id: 'accesorios', label: 'accesorios' },
] as const;
