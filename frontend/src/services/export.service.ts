import { api } from './api';

function descargarBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function fechaHoy(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function exportarInventario() {
  const res = await api.get('/export/admin/inventario', { responseType: 'blob' });
  descargarBlob(res.data, `TiendaUCN_Inventario_${fechaHoy()}.xlsx`);
}

export async function exportarVentas() {
  const res = await api.get('/export/admin/ventas', { responseType: 'blob' });
  descargarBlob(res.data, `TiendaUCN_Ventas_${fechaHoy()}.xlsx`);
}

export async function exportarTac() {
  const res = await api.get('/export/admin/tac', { responseType: 'blob' });
  descargarBlob(res.data, `TiendaUCN_TAC_${fechaHoy()}.xlsx`);
}

export async function exportarUsuarios() {
  const res = await api.get('/export/admin/usuarios', { responseType: 'blob' });
  descargarBlob(res.data, `TiendaUCN_Usuarios_${fechaHoy()}.xlsx`);
}

export async function exportarTodo() {
  const res = await api.get('/export/admin/todo', { responseType: 'blob' });
  descargarBlob(res.data, `TiendaUCN_Reporte_Unificado_${fechaHoy()}.xlsx`);
}
