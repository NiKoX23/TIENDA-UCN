const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_HORA = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function esFechaISOValida(fecha: string): boolean {
  if (!FORMATO_FECHA.test(fecha)) return false;
  const milisegundos = Date.parse(`${fecha}T00:00:00Z`);
  return (
    Number.isFinite(milisegundos) &&
    new Date(milisegundos).toISOString().slice(0, 10) === fecha
  );
}

export function esRangoHorarioValido(
  horaInicio: string,
  horaTermino: string,
): boolean {
  return (
    FORMATO_HORA.test(horaInicio) &&
    FORMATO_HORA.test(horaTermino) &&
    horaTermino > horaInicio
  );
}

export function seSuperponenHorarios(
  inicioA: string,
  terminoA: string,
  inicioB: string,
  terminoB: string,
): boolean {
  return inicioA < terminoB && terminoA > inicioB;
}

export function fechaYHoraEnSantiago(fechaActual = new Date()): {
  fecha: string;
  hora: string;
} {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fechaActual);
  const valores = Object.fromEntries(
    partes.map((parte) => [parte.type, parte.value]),
  );
  return {
    fecha: `${valores.year}-${valores.month}-${valores.day}`,
    hora: `${valores.hour}:${valores.minute}`,
  };
}

export function horarioComienzaEnFuturo(
  fecha: string,
  horaInicio: string,
  ahora: { fecha: string; hora: string },
): boolean {
  return (
    fecha > ahora.fecha || (fecha === ahora.fecha && horaInicio > ahora.hora)
  );
}
