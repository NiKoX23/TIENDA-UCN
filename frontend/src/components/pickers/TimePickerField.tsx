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
  disabled?: boolean;
}

type ColumnaHora = 'horas' | 'minutos';

const HORAS = Array.from({ length: 24 }, (_, indice) => indice);
const MINUTOS = Array.from({ length: 12 }, (_, indice) => indice * 5);

function horaValida(value: string): boolean {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return false;
  return Number(value.slice(3)) % 5 === 0;
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
  const errorHora = texto.length === 0
    ? (tocado ? 'Selecciona una hora.' : '')
    : !horaValida(texto)
      ? 'Usa formato 24 h HH:mm y minutos de 5 en 5.'
      : '';

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
    const seleccionado = partesHora(value);
    setHoraActiva(seleccionado.hora);
    setMinutoActivo(seleccionado.minuto);
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
    const minuto = horaValida(value) ? Number(value.slice(3, 5)) : minutoActivo;
    setHoraActiva(hora);
    setColumnaActiva('minutos');
    guardarHora(hora, minuto);
    enfocarOpcion('minutos', MINUTOS.indexOf(minuto));
  };

  const seleccionarMinuto = (minuto: number) => {
    const hora = horaValida(value) ? Number(value.slice(0, 2)) : horaActiva;
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
        const partes = partesHora(value);
        enfocarOpcion('horas', partes.hora);
      });
      return;
    }
    if (!abierto) return;

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const columna = columnaActiva === 'horas' ? 'minutos' : 'horas';
      setColumnaActiva(columna);
      const indice = columna === 'horas'
        ? (horaValida(value) ? Number(value.slice(0, 2)) : horaActiva)
        : (horaValida(value) ? MINUTOS.indexOf(Number(value.slice(3, 5))) : MINUTOS.indexOf(minutoActivo));
      enfocarOpcion(columna, indice);
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      if (columnaActiva === 'horas') {
        const siguiente = (horaActiva + (event.key === 'ArrowDown' ? 1 : 23)) % 24;
        setHoraActiva(siguiente);
        enfocarOpcion('horas', siguiente);
      } else {
        const actual = MINUTOS.indexOf(minutoActivo);
        const siguiente = (actual + (event.key === 'ArrowDown' ? 1 : MINUTOS.length - 1)) % MINUTOS.length;
        const minuto = MINUTOS[siguiente];
        setMinutoActivo(minuto);
        enfocarOpcion('minutos', siguiente);
      }
      return;
    }

    if (event.key === 'Enter' && event.target === inputRef.current) {
      event.preventDefault();
      if (columnaActiva === 'horas') seleccionarHora(horaActiva);
      else seleccionarMinuto(minutoActivo);
    }
  };

  const cambiarBorrador = (nuevoTexto: string) => {
    setBorrador({ value, draft: nuevoTexto });
    const valido = horaValida(nuevoTexto);
    onValidityChange(valido);
    if (!valido) return;

    const partes = partesHora(nuevoTexto);
    setHoraActiva(partes.hora);
    setMinutoActivo(partes.minuto);
    onChange(nuevoTexto);
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
      className="picker-field"
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
              return;
            }
            abrirSelector();
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
