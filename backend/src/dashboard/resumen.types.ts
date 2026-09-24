export interface ResumenGeneral {
  totalProductos: number;
  totalUnidadesIniciales: number;
  stockActualTotal: number;
  unidadesVendidas: number;
  porcentajeVendido: number;
}

export interface ResumenVentas {
  totalVentas: number;
  ventasNormales: number;
  ventasTac: number;
  ingresoNormal: number;
  ingresoTac: number;
  ingresoTotal: number;
  gananciaTotal: number;
}

export interface ResumenControlTac {
  totalDocumentos: number;
  aprobados: number;
  pendientes: number;
  montoTotal: number;
}

export interface ResumenProducto {
  codigoProducto: string;
  nombre: string;
  categoria: string;
  cantInicial: number;
  stock: number;
  vendidos: number;
  porcentajeVendido: number;
  ingresoNormal: number;
  ingresoTac: number;
}

export interface AlertaStock {
  codigoProducto: string;
  nombre: string;
  sku: string;
  talla: string;
  color: string | null;
  stock: number;
  stockMinimo: number;
  estado: 'CRITICO' | 'BAJO' | 'NORMAL' | 'ALTO';
}

export interface ResumenDashboard {
  general: ResumenGeneral;
  ventas: ResumenVentas;
  controlTac: ResumenControlTac;
  resumenPorProducto: ResumenProducto[];
  alertasStockBajo: AlertaStock[];
}
