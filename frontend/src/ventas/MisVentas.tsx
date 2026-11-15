import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackToStore from '../components/BackToStore';
import Paginacion from '../components/Paginacion';
import StoreHeader from '../components/StoreHeader';
import type { Usuario } from '../services/auth.service';
import { listarMisVentas, type BoletaVenta, type OrdenBoleta } from '../services/listados.service';
import type { TipoVenta } from '../services/ventas.service';
import { mensajeErrorApi } from '../utils/mensajeErrorApi';
import { formatearCLP } from '../utils/precio';

interface MisVentasProps {
  usuario: Usuario;
  tema: 'dark' | 'light';
  onToggleTema: () => void;
  onLogout: () => void;
}

interface ResultadoVentas {
  clave: string;
  data: BoletaVenta[];
  total: number;
  totalPaginas: number;
  error: string;
}

const LIMITE_VENTAS = 10;

function mostrarFecha(fecha: string): string {
  const date = new Date(fecha);
  return Number.isNaN(date.getTime())
    ? 'Fecha no disponible'
    : date.toLocaleDateString('es-CL', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

export default function MisVentas({
  usuario,
  tema,
  onToggleTema,
  onLogout,
}: MisVentasProps) {
  const [busqueda, setBusqueda] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [tipo, setTipo] = useState<'todos' | TipoVenta>('todos');
  const [orden, setOrden] = useState<OrdenBoleta>('fecha-desc');
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<ResultadoVentas | null>(null);
  const [intento, setIntento] = useState(0);
  const navigate = useNavigate();
  const parametros = useMemo(() => ({
    page: pagina,
    limit: LIMITE_VENTAS,
    q: busqueda.trim() || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
    tipo,
    orden,
  }), [pagina, busqueda, desde, hasta, tipo, orden]);
  const claveConsulta = `${JSON.stringify(parametros)}:${intento}`;
  const datosActuales = resultado?.clave === claveConsulta ? resultado : null;
  const boletas = datosActuales?.data ?? [];
  const total = datosActuales?.total ?? 0;
  const totalPaginas = datosActuales?.totalPaginas ?? 1;
  const error = datosActuales?.error ?? '';
  const cargando = datosActuales === null;

  useEffect(() => {
    let activo = true;
    listarMisVentas(parametros)
      .then((resultado) => {
        if (!activo) return;
        setResultado({
          clave: claveConsulta,
          data: resultado.data,
          total: resultado.total,
          totalPaginas: resultado.totalPages,
          error: '',
        });
      })
      .catch((e: unknown) => {
        if (activo) {
          setResultado({
            clave: claveConsulta,
            data: [],
            total: 0,
            totalPaginas: 1,
            error: mensajeErrorApi(e, 'No se pudieron cargar tus ventas.'),
          });
        }
      });

    return () => {
      activo = false;
    };
  }, [parametros, claveConsulta]);

  return (
    <div className="min-h-screen">
      <StoreHeader
        usuario={usuario}
        tema={tema}
        busqueda={busqueda}
        busquedaPlaceholder="Buscar boleta, producto o SKU"
        categoriaActiva="ventas"
        favoritos={0}
        carritoCantidad={0}
        onToggleTema={onToggleTema}
        onPerfil={() => navigate('/perfil')}
        onLogin={() => navigate('/login')}
        onLogout={onLogout}
        onAdmin={() => navigate('/admin')}
        onBusquedaChange={(valor) => {
          setBusqueda(valor);
          setPagina(1);
        }}
        onSelectCategoria={() => navigate('/')}
        onFavoritos={() => navigate('/')}
        onCarrito={() => navigate('/')}
      />
      <main className="seller-shifts-main mx-auto w-full max-w-[1080px] px-4 pb-14 pt-8 sm:px-8">
        <BackToStore className="mb-6" />
        <header className="seller-shifts-heading">
          <span className="vcm-eyebrow">Panel de vendedor</span>
          <h1>Mis ventas</h1>
          <p>Historial de ventas asociadas a tu cuenta, con filtros por fecha y tipo.</p>
        </header>

        <section className="vcm-card mt-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Filtros de ventas">
          <label className="text-sm font-semibold">
            Desde
            <input
              className="vcm-input mt-1"
              type="date"
              value={desde}
              max={hasta || undefined}
              onChange={(event) => {
                setDesde(event.target.value);
                setPagina(1);
              }}
            />
          </label>
          <label className="text-sm font-semibold">
            Hasta
            <input
              className="vcm-input mt-1"
              type="date"
              value={hasta}
              min={desde || undefined}
              onChange={(event) => {
                setHasta(event.target.value);
                setPagina(1);
              }}
            />
          </label>
          <label className="text-sm font-semibold">
            Tipo de venta
            <select
              className="vcm-input mt-1"
              value={tipo}
              onChange={(event) => {
                const valor = event.target.value;
                setTipo(valor === 'normal' || valor === 'tac' ? valor : 'todos');
                setPagina(1);
              }}
            >
              <option value="todos">Todos los tipos</option>
              <option value="normal">Normal</option>
              <option value="tac">TAC</option>
            </select>
          </label>
          <label className="text-sm font-semibold sm:col-span-2 lg:col-span-3">
            Ordenar
            <select
              className="vcm-input mt-1"
              value={orden}
              onChange={(event) => {
                setOrden(event.target.value === 'fecha-asc' ? 'fecha-asc' : 'fecha-desc');
                setPagina(1);
              }}
            >
              <option value="fecha-desc">Más recientes</option>
              <option value="fecha-asc">Más antiguas</option>
            </select>
          </label>
        </section>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--text-soft)]">
          <span>{total} {total === 1 ? 'venta' : 'ventas'}</span>
          <button
            type="button"
            className="vcm-btn vcm-btn--surface vcm-btn--sm"
            onClick={() => {
              setBusqueda('');
              setDesde('');
              setHasta('');
              setTipo('todos');
              setOrden('fecha-desc');
              setPagina(1);
            }}
          >
            Limpiar filtros
          </button>
        </div>

        {error ? (
          <div className="seller-shifts-error mt-4" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => setIntento((actual) => actual + 1)}>
              Reintentar
            </button>
          </div>
        ) : cargando ? (
          <div className="vcm-spinner py-12" role="status">Cargando tus ventas...</div>
        ) : boletas.length === 0 ? (
          <section className="seller-shifts-empty mt-4">
            <span aria-hidden="true">$</span>
            <h2>{busqueda || desde || hasta || tipo !== 'todos' ? 'No hay ventas con esos filtros.' : 'Aún no tienes ventas asignadas.'}</h2>
            <p>Las ventas registradas a tu nombre aparecerán aquí.</p>
          </section>
        ) : (
          <div className="mt-4 space-y-4">
            {boletas.map((boleta) => (
              <article className="vcm-card p-4 shadow-sm sm:p-5" key={boleta.idFactura}>
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
                  <div>
                    <h2 className="font-extrabold">Venta {boleta.numeroDocumento}</h2>
                    <time className="mt-1 block text-sm text-[var(--text-soft)]" dateTime={boleta.fecha}>
                      {mostrarFecha(boleta.fecha)}
                    </time>
                  </div>
                  <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-bold uppercase">
                    {boleta.tipoVenta === 'tac' ? 'TAC' : 'Normal'}
                  </span>
                </header>
                <ul className="divide-y divide-[var(--border)]">
                  {boleta.lineas.map((linea) => (
                    <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={linea.idSalida}>
                      <div className="min-w-0">
                        <p className="font-semibold">{linea.producto}</p>
                        <p className="text-xs text-[var(--text-soft)]">
                          {linea.sku} · {linea.cantidad} {linea.cantidad === 1 ? 'unidad' : 'unidades'}
                          {linea.color ? ` · ${linea.color}` : ''}
                          {linea.talla && linea.talla.toLowerCase() !== 'unica' ? ` · Talla ${linea.talla}` : ''}
                        </p>
                      </div>
                      <strong>{formatearCLP(linea.subtotal)}</strong>
                    </li>
                  ))}
                </ul>
                <footer className="flex justify-between border-t border-[var(--border)] pt-3">
                  <span className="text-sm text-[var(--text-soft)]">
                    {boleta.unidades} {boleta.unidades === 1 ? 'unidad' : 'unidades'} · {boleta.metodoPago}
                  </span>
                  <strong className="text-lg">{formatearCLP(boleta.subtotal)}</strong>
                </footer>
              </article>
            ))}
          </div>
        )}

        {!cargando && !error && total > 0 && (
          <Paginacion
            className="mt-6"
            pagina={pagina}
            totalPaginas={totalPaginas}
            total={total}
            desde={(pagina - 1) * LIMITE_VENTAS + 1}
            hasta={Math.min(pagina * LIMITE_VENTAS, total)}
            etiqueta="ventas"
            onCambiar={setPagina}
          />
        )}
      </main>
    </div>
  );
}
