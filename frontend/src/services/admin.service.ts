import { api } from './api';

export interface AdminUsuario {
    uid: number;
    nombre: string;
    email: string;
    proveedorAuth: string;
    esAdmin: boolean;
    esVendedor: boolean;
    fechaRegistro: string;
}

export async function listarUsuarios(): Promise<AdminUsuario[]> {
    const { data } = await api.get<AdminUsuario[]>('/auth/admin/usuarios');
    return data;
}

export async function cambiarRol(
    uid: number,
    role: 'usuario' | 'vendedor' | 'admin',
): Promise<{ uid: number; role: 'usuario' | 'vendedor' | 'admin'; esAdmin: boolean; esVendedor: boolean }> {
    const { data } = await api.patch<{
        uid: number;
        role: 'usuario' | 'vendedor' | 'admin';
        esAdmin: boolean;
        esVendedor: boolean;
    }>(`/auth/admin/usuarios/${uid}/rol`, { role });
    return data;
}

export async function eliminarUsuario(uid: number): Promise<{ uid: number; eliminado: boolean }> {
    const { data } = await api.delete<{ uid: number; eliminado: boolean }>(`/auth/admin/usuarios/${uid}`);
    return data;
}
