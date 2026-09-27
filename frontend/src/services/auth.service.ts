import { api } from './api';

export interface Usuario {
    uid: number;
    nombre: string;
    email: string;
    esAdmin: boolean;
}

const coloresAvatar = [
    '#9a3412',
    '#9f1239',
    '#6b21a8',
    '#1e40af',
    '#155e75',
    '#166534',
    '#713f12',
    '#334155',
];

export function obtenerColorAvatar(uid: number): string {
    return coloresAvatar[Math.abs(uid) % coloresAvatar.length];
}

export function obtenerIniciales(nombre?: string, email?: string): string {
    const partesNombre = nombre?.trim().split(/\s+/).filter(Boolean) ?? [];
    if (partesNombre.length >= 2) {
        return `${partesNombre[0][0]}${partesNombre[partesNombre.length - 1][0]}`.toUpperCase();
    }

    if (partesNombre.length === 1) {
        return partesNombre[0].slice(0, 2).toUpperCase();
    }

    const nombreCorreo = email?.trim().split('@')[0] ?? '';
    const partesCorreo = nombreCorreo.split(/[._-]+/).filter(Boolean);
    if (partesCorreo.length >= 2) {
        return `${partesCorreo[0][0]}${partesCorreo[partesCorreo.length - 1][0]}`.toUpperCase();
    }

    return (nombreCorreo.slice(0, 2) || 'U').toUpperCase();
}

export async function login(email: string, password: string): Promise<Usuario> {
    const { data } = await api.post('/auth/login', { email, password });
    return data.usuario;
}

export async function register(nombre: string, email: string, password: string): Promise<Usuario> {
    const { data } = await api.post('/auth/register', { nombre, email, password });
    return data.usuario;
}

export async function obtenerPerfil(): Promise<Usuario | null> {
    try {
        const { data } = await api.get('/auth/perfil');
        return data;
    } catch {
        return null;
    }
}

export async function updateProfile(nombre: string, email: string, password?: string): Promise<Usuario> {
    const { data } = await api.put('/auth/perfil', { nombre, email, password });
    return data.usuario;
}

export async function logout(): Promise<void> {
    await api.post('/auth/logout');
}

export function loginConGoogle() {
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    window.location.href = `${apiUrl}/auth/google`;
}