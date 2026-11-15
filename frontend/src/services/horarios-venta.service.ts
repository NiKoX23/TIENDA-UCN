import { api } from './api';

export interface VendedorBiblioteca {
  idVendedor: number;
  nombre: string;
  email?: string;
  activo: boolean;
  fechaCreacion: string;
}

export interface UsuarioElegibleVendedor {
  uid: number;
  nombre: string;
  email: string;
}

export interface HorarioVenta {
  idHorario: number;
  idVendedor: number;
  fecha: string;
  horaInicio: string;
  horaTermino: string;
  activo: boolean;
  vendedor: VendedorBiblioteca;
}

export interface DatosCrearHorario {
  idVendedor: number;
  fecha: string;
  horaInicio: string;
  horaTermino: string;
}

export async function listarVendedoresBiblioteca(): Promise<VendedorBiblioteca[]> {
  const { data } = await api.get<VendedorBiblioteca[]>('/reservas/admin/vendedores');
  return data;
}

export async function crearVendedorBiblioteca(
  uidUsuario: number,
): Promise<VendedorBiblioteca> {
  const { data } = await api.post<VendedorBiblioteca>(
    '/reservas/admin/vendedores',
    { uidUsuario },
  );
  return data;
}

export async function eliminarVendedorBiblioteca(
  idVendedor: number,
): Promise<{ idVendedor: number; horariosEliminados: number }> {
  const { data } = await api.delete<{
    idVendedor: number;
    horariosEliminados: number;
  }>(`/reservas/admin/vendedores/${idVendedor}`);
  return data;
}

export async function cambiarDisponibilidadVendedor(
  idVendedor: number,
  activo: boolean,
): Promise<VendedorBiblioteca> {
  const { data } = await api.patch<VendedorBiblioteca>(
    `/reservas/admin/vendedores/${idVendedor}/estado`,
    { activo },
  );
  return data;
}

export async function buscarUsuariosVendedores(
  texto: string,
): Promise<UsuarioElegibleVendedor[]> {
  const { data } = await api.get<UsuarioElegibleVendedor[]>(
    '/reservas/admin/vendedores/usuarios',
    { params: { q: texto } },
  );
  return data;
}

export async function listarHorariosVenta(): Promise<HorarioVenta[]> {
  const { data } = await api.get<HorarioVenta[]>('/reservas/admin/horarios');
  return data;
}

export async function crearHorarioVenta(
  horario: DatosCrearHorario,
): Promise<HorarioVenta> {
  const { data } = await api.post<HorarioVenta>(
    '/reservas/admin/horarios',
    horario,
  );
  return data;
}

export async function cambiarDisponibilidadHorario(
  idHorario: number,
  activo: boolean,
): Promise<HorarioVenta> {
  const { data } = await api.patch<HorarioVenta>(
    `/reservas/admin/horarios/${idHorario}/disponibilidad`,
    { activo },
  );
  return data;
}

export async function listarHorariosDisponibles(
  fecha: string,
): Promise<HorarioVenta[]> {
  const { data } = await api.get<HorarioVenta[]>(
    '/reservas/horarios-disponibles',
    { params: { fecha } },
  );
  return data;
}

export async function listarMisTurnos(): Promise<HorarioVenta[]> {
  const { data } = await api.get<HorarioVenta[]>('/reservas/mis-turnos');
  return data;
}

export async function listarMisHorarios(): Promise<HorarioVenta[]> {
  const { data } = await api.get<HorarioVenta[]>('/reservas/mis-horarios');
  return data;
}

export function claveAvisoTurnosVendedor(uid: number): string {
  return `aviso-turnos-vendedor:${uid}`;
}
