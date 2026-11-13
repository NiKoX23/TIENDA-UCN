import {
  esFechaISOValida,
  esRangoHorarioValido,
  horarioComienzaEnFuturo,
} from './horarios-venta.util';

describe('validación de horarios de venta', () => {
  it('solo acepta intervalos con término posterior al inicio', () => {
    expect(esRangoHorarioValido('09:00', '18:00')).toBe(true);
    expect(esRangoHorarioValido('09:00', '07:00')).toBe(false);
    expect(esRangoHorarioValido('09:00', '09:00')).toBe(false);
    expect(esRangoHorarioValido('24:00', '25:00')).toBe(false);
  });

  it('valida fechas de calendario reales en formato ISO', () => {
    expect(esFechaISOValida('2028-02-29')).toBe(true);
    expect(esFechaISOValida('2027-02-29')).toBe(false);
    expect(esFechaISOValida('2027-13-01')).toBe(false);
  });

  it('considera disponible únicamente un inicio posterior a la hora actual', () => {
    const ahora = { fecha: '2027-08-03', hora: '09:00' };
    expect(horarioComienzaEnFuturo('2027-08-03', '09:05', ahora)).toBe(true);
    expect(horarioComienzaEnFuturo('2027-08-03', '09:00', ahora)).toBe(false);
    expect(horarioComienzaEnFuturo('2027-08-02', '12:00', ahora)).toBe(false);
    expect(horarioComienzaEnFuturo('2027-08-04', '08:00', ahora)).toBe(true);
  });
});
