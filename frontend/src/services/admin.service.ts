import { api } from './api';

export interface AdminUsuario {
    uid: number;
    nombre: string;
    email: string;
    proveedorAuth: string;
    esAdmin: boolean;
    fechaRegistro: string;
}

export async function listarUsuarios(): Promise<AdminUsuario[]> {
    const { data } = await api.get<AdminUsuario[]>('/auth/admin/usuarios');
    return data;
}

export async function cambiarRol(uid: number, esAdmin: boolean): Promise<{ uid: number; esAdmin: boolean }> {
    const { data } = await api.patch<{ uid: number; esAdmin: boolean }>(`/auth/admin/usuarios/${uid}/rol`, { esAdmin });
    return data;
}