import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useAnchoredPopover } from './useAnchoredPopover';

interface TimePickerFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onValidityChange: (valid: boolean) => void;
  minTime?: string;
  disabled?: boolean;
}

type ColumnaHora = 'horas' | 'minutos';

const HORAS = Array.from({ length: 24 }, (_, indice) => indice);
const MINUTOS = Array.from({ length: 60 }, (_, indice) => indice);

function horaValida(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function partesHora(value: string): { hora: number; minuto: number } {
  if (!horaValida(value)) return { hora: 9, minuto: 0 };
  return {
    hora: Number(value.slice(0, 2)),
    minuto: Number(value.slice(3, 5)),
  };
}

function formatearHora(hora: number, minuto: number): string {
  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
}

function enmascararHora(value: string): string {
  const digitos = value.replace(/\D/g, '').slice(0, 4);
  return digitos.length > 2
    ? `${digitos.slice(0, 2)}:${digitos.slice(2)}`
    : digitos;
}

function IconoReloj() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export default function TimePickerField({
  id,
  value,
  onChange,
  onValidityChange,
  minTime,
  disabled = false,
}: TimePickerFieldProps) {
  const [abierto, setAbierto] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [columnaActiva, setColumnaActiva] = useState<ColumnaHora>('horas');
  const [horaActiva, setHoraActiva] = useState(() => partesHora(value).hora);
  const [minutoActivo, setMinutoActivo] = useState(() => partesHora(value).minuto);
  const [borrador, setBorrador] = useState({ value, draft: value });
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const campoRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const omitirAperturaAlEnfocar = useRef(false);
  const reactId = useId();
  const panelId = `selector-hora-${reactId}`;
  const texto = borrador.value === value ? borrador.draft : value;
  const posicion = useAnchoredPopover({
    abierto,
    anclaRef: campoRef,
    panelRef,
    anchoMinimo: 300,
  });
  const horaPermitida = (hora: string) =>
    horaValida(hora) && (!minTime || !horaValida(minTime) || hora > minTime);
  const opcionesMinuto = (hora: number) =>
    MINUTOS.filter((minuto) => horaPermitida(formatearHora(hora, minuto)));
  const errorHora = texto.length === 0
    ? (tocado ? 'Selecciona una hora.' : '')
    : !horaValida(texto)
      ? 'Ingresa una hora válida en formato HH:mm.'
      : minTime && horaValida(minTime) && texto <= minTime
        ? `Debe ser posterior a ${minTime}.`
      : '';

  useEffect(() => {
    onValidityChange(
      horaValida(value) &&
      (!minTime || !horaValida(minTime) || value > minTime),
    );
  }, [value, minTime, onValidityChange]);

  useEffect(() => {
    if (!abierto) return;
    const cerrarFuera = (event: PointerEvent) => {
      const destino = event.target;
      if (
        destino instanceof Node &&
        !campoRef.current?.contains(destino) &&
        !panelRef.current?.contains(destino)
      ) {
        setAbierto(false);
      }
    };
    document.addEventListener('pointerdown', cerrarFuera);
    return () => document.removeEventListener('pointerdown', cerrarFuera);
  }, [abierto]);

  const enfocarOpcion = (columna: ColumnaHora, indice: number) => {
    window.requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLButtonElement>(
          `[data-time-column="${columna}"][data-index="${indice}"]`,
        )
        ?.focus();
    });
  };

  const enfocarCampo = () => {
    if (document.activeElement === inputRef.current) return;
    omitirAperturaAlEnfocar.current = true;
    inputRef.current?.focus();
  };

  const abrirSelector = () => {
    if (disabled) return;
    setTocado(true);
    const seleccionado = partesHora(horaPermitida(value) ? value : (minTime ?? '09:00'));
    const minutosDisponibles = opcionesMinuto(seleccionado.hora);
    const minuto = minutosDisponibles.includes(seleccionado.minuto)
      ? seleccionado.minuto
      : minutosDisponibles[0] ?? 0;
    setHoraActiva(seleccionado.hora);
    setMinutoActivo(minuto);
    setColumnaActiva('horas');
    setPortal(
      campoRef.current?.closest<HTMLElement>('[role="dialog"]') ?? document.body,
    );
    setAbierto(true);
  };

  const guardarHora = (hora: number, minuto: number) => {
    const nuevaHora = formatearHora(hora, minuto);
    setBorrador({ value: nuevaHora, draft: nuevaHora });
    onChange(nuevaHora);
    onValidityChange(true);
  };

  const seleccionarHora = (hora: number) => {
    const disponibles = opcionesMinuto(hora);
    if (disponibles.length === 0) return;
    const minutoActual = horaValida(value) ? Number(value.slice(3, 5)) : minutoActivo;
    const minuto = disponibles.includes(minutoActual) ? minutoActual : disponibles[0];
    setHoraActiva(hora);
    setMinutoActivo(minuto);
    setColumnaActiva('minutos');
    guardarHora(hora, minuto);
    enfocarOpcion('minutos', minuto);
  };

  const seleccionarMinuto = (minuto: number) => {
    const hora = horaValida(value) ? Number(value.slice(0, 2)) : horaActiva;
    if (!horaPermitida(formatearHora(hora, minuto))) return;
    setMinutoActivo(minuto);
    guardarHora(hora, minuto);
    setAbierto(false);
    enfocarCampo();
  };

  const manejarTeclado = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && abierto) {
      event.preventDefault();
      event.stopPropagation();
      setAbierto(false);
      enfocarCampo();
      return;
    }

    if (!abierto && event.key === 'ArrowDown') {
      event.preventDefault();
      abrirSelector();
      window.requestAnimationFrame(() => {
        const partes = partesHora(horaPermitida(value) ? value : (minTime ?? '09:00'));
        enfocarOpcion('horas', partes.hora);
      });
      return;
    }
    if (!abierto) return;

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const columna = columnaActiva === 'horas' ? 'minutos' : 'horas';
      setColumnaActiva(columna);
      const horasDisponibles = HORAS.filter((hora) =>
        horaPermitida(formatearHora(hora, 59)),
      );
      const minutosDisponibles = opcionesMinuto(horaActiva);
      const indice = columna === 'horas'
        ? (horasDisponibles.includes(horaActiva) ? horaActiva : horasDisponibles[0] ?? 0)
        : (minutosDisponibles.includes(minutoActivo) ? minutoActivo : minutosDisponibles[0] ?? 0);
      if (columna === 'horas') setHoraActiva(indice);
      else setMinutoActivo(indice);
      enfocarOpcion(columna, indice);
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      if (columnaActiva === 'horas') {
        const siguiente = HORAS.find((hora) =>
          horaPermitida(formatearHora(hora, 59)) &&
          (event.key === 'ArrowDown' ? hora > horaActiva : hora < horaActiva),
        ) ?? HORAS.find((hora) => horaPermitida(formatearHora(hora, 59)));
        if (siguiente === undefined) return;
        setHoraActiva(siguiente);
        enfocarOpcion('horas', siguiente);
      } else {
        const disponibles = opcionesMinuto(horaActiva);
        const minuto = disponibles.find((opcion) =>
          event.key === 'ArrowDown' ? opcion > minutoActivo : opcion < minutoActivo,
        ) ?? (event.key === 'ArrowDown'
          ? disponibles[0]
          : disponibles[disponibles.length - 1]);
        if (minuto === undefined) return;
        setMinutoActivo(minuto);
        enfocarOpcion('minutos', minuto);
      }
      return;
    }

    if (event.key === 'Enter' && event.target === inputRef.current) {
      event.preventDefault();
      if (horaPermitida(texto)) {
        setAbierto(false);
        enfocarCampo();
      }
    }
  };

  const cambiarBorrador = (nuevoTexto: string) => {
    const textoEnmascarado = enmascararHora(nuevoTexto);
    setBorrador({ value, draft: textoEnmascarado });
    const valido = horaPermitida(textoEnmascarado);
    onChange(textoEnmascarado);
    onValidityChange(valido);
    if (!valido) return;

    const partes = partesHora(textoEnmascarado);
    setHoraActiva(partes.hora);
    setMinutoActivo(partes.minuto);
  };

  const popover = abierto && portal
    ? createPortal(
        <div
          id={panelId}
          ref={panelRef}
          className="picker-popover time-picker-popover"
          role="dialog"
          aria-label="Seleccionar hora"
          style={{
            top: posicion?.top ?? 0,
            left: posicion?.left ?? 0,
            width: posicion?.width ?? 300,
            maxHeight: posicion?.maxHeight ?? 280,
            visibility: posicion ? 'visible' : 'hidden',
          }}
        >
          {(['horas', 'minutos'] as const).map((columna) => {
            const opciones = columna === 'horas' ? HORAS : MINUTOS;
            const seleccionado = columna === 'horas'
              ? (horaValida(value) ? Number(value.slice(0, 2)) : horaActiva)
              : (horaValida(value) ? Number(value.slice(3, 5)) : minutoActivo);
            return (
              <section className="time-picker-column" key={columna}>
                <h3 className="picker-column-title">
                  {columna === 'horas' ? 'Hora' : 'Minutos'}
                </h3>
                <div
                  className="time-picker-options"
                  role="listbox"
                  aria-label={columna === 'horas' ? 'Horas' : 'Minutos'}
                >
                  {opciones.map((opcion, indice) => (
                    <button
                      key={opcion}
                      type="button"
                      role="option"
                      aria-selected={opcion === seleccionado}
                      data-time-column={columna}
                      data-index={indice}
                      disabled={columna === 'horas'
                        ? !horaPermitida(formatearHora(opcion, 59))
                        : !horaPermitida(formatearHora(
                          horaValida(value) ? Number(value.slice(0, 2)) : horaActiva,
                          opcion,
                        ))}
                      className={`time-picker-option${opcion === seleccionado ? ' is-selected' : ''}`}
                      onFocus={() => {
                        setColumnaActiva(columna);
                        if (columna === 'horas') setHoraActiva(opcion);
                        else setMinutoActivo(opcion);
                      }}
                      onClick={() => {
                        if (columna === 'horas') seleccionarHora(opcion);
                        else seleccionarMinuto(opcion);
                      }}
                    >
                      {String(opcion).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>,
        portal,
      )
    : null;

  return (
    <div
      ref={campoRef}
      className="picker-field picker-field--time"
      onKeyDownCapture={manejarTeclado}
    >
      <div className="picker-input-wrap">
        <input
          ref={inputRef}
          id={id}
          type="text"
          className="vcm-input w-full picker-input"
          value={texto}
          placeholder="HH:mm"
          inputMode="numeric"
          autoComplete="off"
          maxLength={5}
          pattern="(?:[01]\d|2[0-3]):[0-5]\d"
          aria-haspopup="dialog"
          aria-expanded={abierto}
          aria-controls={abierto ? panelId : undefined}
          aria-invalid={Boolean(errorHora) || undefined}
          aria-describedby={errorHora ? `${id}-error` : undefined}
          disabled={disabled}
          required
          onFocus={() => {
            if (omitirAperturaAlEnfocar.current) {
              omitirAperturaAlEnfocar.current = false;
            }
          }}
          onChange={(event) => cambiarBorrador(event.target.value)}
        />
        <button
          type="button"
          className="picker-icon-button"
          aria-label="Abrir selector de hora"
          aria-haspopup="dialog"
          aria-expanded={abierto}
          disabled={disabled}
          onClick={abrirSelector}
        >
          <IconoReloj />
        </button>
      </div>
      {errorHora && (
        <span id={`${id}-error`} className="picker-field-error" role="alert">
          {errorHora}
        </span>
      )}
      {popover}
    </div>
  );
}
