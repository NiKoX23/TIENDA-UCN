export type AdminRole = 'usuario' | 'vendedor' | 'admin';

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  usuario: 'Usuario',
  vendedor: 'Vendedor',
  admin: 'Admin',
};
