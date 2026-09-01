export function parsePrecioCLP(precio: string): number {
  const limpio = precio.replace(/[^\d]/g, '');
  return Number(limpio) || 0;
}

export function formatearCLP(valor: number): string {
  return valor.toLocaleString('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  });
}
