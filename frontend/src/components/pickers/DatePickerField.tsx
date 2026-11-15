import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useAnchoredPopover } from './useAnchoredPopover';

interface DatePickerFieldProps {
  id: string;
  value: string;
  minDate: string;
  onChange: (value: string) => void;
  onValidityChange: (valid: boolean) => void;
  disabled?: boolean;
}

const NOMBRES_DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

function fechaValida(value: string): string | null {
  let year: number;
  let month: number;
  let day: number;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const local = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const localizada = /^(?:[a-záéíóúüñ]+,?\s+)?(\d{1,2})\s+([a-záéíóúüñ.]+)\s+(\d{4})$/i.exec(value.trim());
  if (iso) {
    [, year, month, day] = iso.map(Number);
  } else if (local) {
    [, day, month, year] = local.map(Number);
  } else if (localizada) {
    day = Number(localizada[1]);
    year = Number(localizada[3]);
    const mesTexto = localizada[2].toLocaleLowerCase('es-CL').replace(/\.$/, '');
    month = Array.from({ length: 12 }, (_, indice) => indice + 1).find((mes) => {
      const fecha = new Date(Date.UTC(2020, mes - 1, 1, 12));
      const formatos = ['short', 'long'].map((monthStyle) =>
        new Intl.DateTimeFormat('es-CL', {
          month: monthStyle as 'short' | 'long',
          timeZone: 'UTC',
        }).format(fecha).toLocaleLowerCase('es-CL').replace(/\.$/, ''),
      );
      return formatos.includes(mesTexto);
    }) ?? 0;
  } else {
    return null;
  }
  const fecha = new Date(Date.UTC(year, month - 1, day));
  if (
    fecha.getUTCFullYear() !== year ||
    fecha.getUTCMonth() + 1 !== month ||
    fecha.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function partesISO(value: string): { year: number; month: number; day: number } | null {
  const fecha = fechaValida(value);
  if (!fecha) return null;
  const [year, month, day] = fecha.split('-').map(Number);
  return { year, month, day };
}

function mostrarFecha(value: string): string {
  const partes = partesISO(value);
  if (!partes) return value;
  const fecha = new Date(Date.UTC(partes.year, partes.month - 1, partes.day, 12));
  const valores = Object.fromEntries(
    new Intl.DateTimeFormat('es-CL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).formatToParts(fecha).map((parte) => [parte.type, parte.value]),
  );
  const diaSemana = valores.weekday.charAt(0).toLocaleUpperCase('es-CL') + valores.weekday.slice(1);
  return `${diaSemana} ${valores.day} ${valores.month} ${valores.year}`;
}

function claveFecha(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function IconoCalendario() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

export default function DatePickerField({
  id,
  value,
  minDate,
  onChange,
  onValidityChange,
  disabled = false,
}: DatePickerFieldProps) {
  const [abierto, setAbierto] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [borrador, setBorrador] = useState(() => ({
    value,
    draft: mostrarFecha(value),
  }));
  const [mesVisible, setMesVisible] = useState(() => {
    const ahora = new Date();
    const partes = partesISO(value) ?? partesISO(minDate) ?? {
      year: ahora.getUTCFullYear(),
      month: ahora.getUTCMonth() + 1,
      day: ahora.getUTCDate(),
    };
    return { year: partes.year, month: partes.month };
  });
  const [fechaEnFoco, setFechaEnFoco] = useState(value || minDate);
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const campoRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const omitirAperturaAlEnfocar = useRef(false);
  const reactId = useId();
  const panelId = `selector-fecha-${reactId}`;
  const texto = borrador.value === value ? borrador.draft : mostrarFecha(value);
  const posicion = useAnchoredPopover({
    abierto,
    anclaRef: campoRef,
    panelRef,
    anchoMinimo: 300,
  });
  const fechaConvertida = fechaValida(texto);
  const errorFecha = texto.length === 0
    ? (tocado ? 'Selecciona una fecha.' : '')
    : !fechaConvertida
      ? 'Ingresa una fecha válida en formato DD/MM/AAAA.'
      : fechaConvertida < minDate
        ? 'La fecha no puede estar en el pasado.'
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

  const enfocarFecha = (fecha: string) => {
    window.requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLButtonElement>(`[data-calendar-date="${fecha}"]`)
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
    const seleccionado = partesISO(value) ?? partesISO(minDate);
    if (seleccionado) {
      setMesVisible({ year: seleccionado.year, month: seleccionado.month });
      setFechaEnFoco(claveFecha(seleccionado.year, seleccionado.month, seleccionado.day));
    }
    setPortal(
      campoRef.current?.closest<HTMLElement>('[role="dialog"]') ?? document.body,
    );
    setAbierto(true);
  };

  const seleccionarFecha = (fecha: string) => {
    if (fecha < minDate) return;
    setBorrador({ value: fecha, draft: mostrarFecha(fecha) });
    onChange(fecha);
    onValidityChange(true);
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
      const primeraFecha = value && value >= minDate ? value : minDate;
      abrirSelector();
      window.requestAnimationFrame(() => enfocarFecha(primeraFecha));
      return;
    }
    if (!abierto) return;

    if (
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
    ) {
      const destino = event.target;
      const fechaActual = destino instanceof HTMLElement
        ? destino.dataset.calendarDate ?? fechaEnFoco
        : fechaEnFoco;
      const actual = partesISO(fechaActual) ?? partesISO(minDate);
      if (!actual) return;
      event.preventDefault();
      const desplazamiento = event.key === 'ArrowLeft' ? -1
        : event.key === 'ArrowRight' ? 1
          : event.key === 'ArrowUp' ? -7 : 7;
      const siguiente = new Date(Date.UTC(actual.year, actual.month - 1, actual.day + desplazamiento));
      const clave = claveFecha(
        siguiente.getUTCFullYear(),
        siguiente.getUTCMonth() + 1,
        siguiente.getUTCDate(),
      );
      const siguientePartes = partesISO(clave);
      if (!siguientePartes || clave < minDate) return;
      setFechaEnFoco(clave);
      setMesVisible({
        year: siguientePartes.year,
        month: siguientePartes.month,
      });
      enfocarFecha(clave);
      return;
    }
    if (event.key === 'Enter' && event.target === inputRef.current) {
      event.preventDefault();
      if (fechaConvertida && fechaConvertida >= minDate) {
        seleccionarFecha(fechaConvertida);
      }
    }
  };

  const cambiarBorrador = (nuevoTexto: string) => {
    setBorrador({ value, draft: nuevoTexto });
    const parseada = fechaValida(nuevoTexto);
    const valida = Boolean(parseada && parseada >= minDate);
    onValidityChange(valida);
    if (parseada && valida) onChange(parseada);
  };

  const desplazarMes = (cantidad: number) => {
    const fecha = new Date(Date.UTC(mesVisible.year, mesVisible.month - 1 + cantidad, 1));
    setMesVisible({
      year: fecha.getUTCFullYear(),
      month: fecha.getUTCMonth() + 1,
    });
  };

  const primerDia = new Date(Date.UTC(mesVisible.year, mesVisible.month - 1, 1));
  const desplazamiento = (primerDia.getUTCDay() + 6) % 7;
  const diasEnMes = new Date(Date.UTC(mesVisible.year, mesVisible.month, 0)).getUTCDate();
  const celdas = Array.from({ length: 42 }, (_, indice) => {
    const dia = indice - desplazamiento + 1;
    return dia > 0 && dia <= diasEnMes ? dia : null;
  });
  const etiquetaMes = new Intl.DateTimeFormat('es-CL', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(mesVisible.year, mesVisible.month - 1, 1, 12)));
  const mesFormateado = etiquetaMes.charAt(0).toLocaleUpperCase('es-CL') + etiquetaMes.slice(1);

  const popover = abierto && portal
    ? createPortal(
        <div
          id={panelId}
          ref={panelRef}
          className="picker-popover date-picker-popover"
          role="dialog"
          aria-label="Seleccionar fecha"
          style={{
            top: posicion?.top ?? 0,
            left: posicion?.left ?? 0,
            width: posicion?.width ?? 300,
            maxHeight: posicion?.maxHeight ?? 360,
            visibility: posicion ? 'visible' : 'hidden',
          }}
        >
          <div className="date-picker-month">
            <button type="button" className="date-picker-nav" onClick={() => desplazarMes(-1)} aria-label="Mes anterior">
              ‹
            </button>
            <h3 aria-live="polite">{mesFormateado}</h3>
            <button type="button" className="date-picker-nav" onClick={() => desplazarMes(1)} aria-label="Mes siguiente">
              ›
            </button>
          </div>
          <div className="date-picker-grid" role="group" aria-label={etiquetaMes}>
            {NOMBRES_DIAS.map((dia) => (
              <span className="date-picker-weekday" key={dia}>{dia}</span>
            ))}
            {celdas.map((dia, indice) => {
              if (!dia) return <span className="date-picker-empty" aria-hidden="true" key={`vacio-${indice}`} />;
              const fecha = claveFecha(mesVisible.year, mesVisible.month, dia);
              const seleccionada = fecha === value;
              const hoy = fecha === minDate;
              return (
                <button
                  type="button"
                  key={fecha}
                  data-calendar-date={fecha}
                  className={`date-picker-day${seleccionada ? ' is-selected' : ''}${hoy ? ' is-today' : ''}`}
                  aria-label={new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-CL', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'America/Santiago',
                  })}
                  aria-selected={seleccionada}
                  aria-current={hoy ? 'date' : undefined}
                  disabled={fecha < minDate}
                  onFocus={() => setFechaEnFoco(fecha)}
                  onClick={() => seleccionarFecha(fecha)}
                >
                  {dia}
                </button>
              );
            })}
          </div>
        </div>,
        portal,
      )
    : null;

  return (
    <div
      ref={campoRef}
      className="picker-field picker-field--date"
      onKeyDownCapture={manejarTeclado}
      onBlurCapture={(event) => {
        const destino = event.relatedTarget;
        if (
          abierto &&
          (!(destino instanceof Node) ||
            (!campoRef.current?.contains(destino) &&
              !panelRef.current?.contains(destino)))
        ) {
          setAbierto(false);
        }
      }}
    >
      <div className="picker-input-wrap">
        <input
          ref={inputRef}
          id={id}
          type="text"
          className="vcm-input w-full picker-input"
          value={texto}
          placeholder="DD/MM/AAAA"
          inputMode="numeric"
          autoComplete="off"
          maxLength={24}
          aria-haspopup="dialog"
          aria-expanded={abierto}
          aria-controls={abierto ? panelId : undefined}
          aria-invalid={Boolean(errorFecha) || undefined}
          aria-describedby={errorFecha ? `${id}-error` : undefined}
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
          aria-label="Abrir calendario"
          aria-haspopup="dialog"
          aria-expanded={abierto}
          disabled={disabled}
          onClick={abrirSelector}
        >
          <IconoCalendario />
        </button>
      </div>
      {errorFecha && (
        <span id={`${id}-error`} className="picker-field-error" role="alert">
          {errorFecha}
        </span>
      )}
      {popover}
    </div>
  );
}
