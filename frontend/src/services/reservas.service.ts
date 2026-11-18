import { api } from './api';

export type EstadoReserva =
  | 'PENDIENTE'
  | 'LISTA_PARA_RETIRO'
  | 'RETIRADA'
  | 'CANCELADA'
  | 'VENCIDA';

export interface LineaReserva {
  idVariante: number;
  cantidad: number;
}

export interface DatosCrearReserva {
  fechaRetiro: string;
  idHorario: number;
  observaciones?: string;
  lineas: LineaReserva[];
}

export interface ItemReserva {
  idItem: number;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  idVariante: number;
  sku: string;
  talla: string;
  color: string | null;
  producto: {
    codigoProducto: string;
    nombre: string;
    imagenUrl: string | null;
  };
}

export interface Reserva {
  idReserva: number;
  codigoReserva: string;
  uid: number;
  usuario?: {
    uid: number;
    nombre: string;
    email: string;
  };
  fechaRetiro: string;
  horario: {
    idHorario: number;
    horaInicio: string;
    horaTermino: string;
    vendedor: {
      idVendedor: number;
      nombre: string;
    };
  } | null;
  bloqueHorario: string | null;
  observaciones: string | null;
  estado: EstadoReserva;
  total: number;
  fechaCreacion: string;
  items: ItemReserva[];
}

export async function crearReserva(datos: DatosCrearReserva): Promise<Reserva> {
  const { data } = await api.post<Reserva>('/reservas', datos);
  return data;
}

export async function listarMisReservas(): Promise<Reserva[]> {
  const { data } = await api.get<Reserva[]>('/reservas/mias');
  return data;
}

export async function cancelarMiReserva(idReserva: number): Promise<Reserva> {
  const { data } = await api.patch<Reserva>(
    `/reservas/${idReserva}/cancelar`,
  );
  return data;
}

export async function listarTodasLasReservas(): Promise<Reserva[]> {
  const { data } = await api.get<Reserva[]>('/reservas/admin');
  return data;
}

export async function listarReservasVendedor(): Promise<Reserva[]> {
  const { data } = await api.get<Reserva[]>('/reservas/vendedor/mias');
  return data;
}

export async function cambiarEstadoReserva(
  idReserva: number,
  estado: EstadoReserva,
): Promise<Reserva> {
  const { data } = await api.patch<Reserva>(
    `/reservas/admin/${idReserva}/estado`,
    { estado },
  );
  return data;
}

export async function cambiarEstadoReservaVendedor(
  idReserva: number,
  estado: Extract<
    EstadoReserva,
    'PENDIENTE' | 'LISTA_PARA_RETIRO' | 'RETIRADA'
  >,
): Promise<Reserva> {
  const { data } = await api.patch<Reserva>(
    `/reservas/vendedor/${idReserva}/estado`,
    { estado },
  );
  return data;
}
