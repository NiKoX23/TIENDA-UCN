import { useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  obtenerAnalisis,
  type FiltrosAnalisis,
} from '../services/analytics.service';
import BackToStore from '../components/BackToStore';
import AnalistaKpiCards from './AnalistaKpiCards';
import AnalistaMainChart from './AnalistaMainChart';
import AnalistaTopProductsCard from './AnalistaTopProductsCard';
import AnalistaForecastTable from './AnalistaForecastTable';
import AnalistaSummaryCard from './AnalistaSummaryCard';

interface Categoria { idCategoria: number; nombre: string }
interface Producto { codigoProducto: string; nombre: string; categoria: string }
type FiltrosBorrador = FiltrosAnalisis;
interface FiltrosEnviados { filtros: FiltrosAnalisis; run: number }

function mensajeErrorAnalisis(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: unknown; message?: unknown } | undefined;
    const detalle = data?.detail ?? data?.message;
    if (Array.isArray(detalle)) return detalle.map(String).join(', ');
    if (typeof detalle === 'string' && detalle.trim()) return detalle;
    if (error.response) return `El servicio de análisis respondió con el código ${error.response.status}.`;
    if (error.code === 'ERR_NETWORK') return 'No se pudo conectar con el servicio de análisis. Comprueba que los servicios estén activos.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'No se pudo obtener el análisis. Inténtalo nuevamente.';
}

export default function AnalistaTab() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [draft, setDraft] = useState<FiltrosBorrador>({ mesesHist: 12, meses: 3 });
  const [enviados, setEnviados] = useState<FiltrosEnviados | null>(null);

  const catalogo = useQuery({
    queryKey: ['analista-filtros-catalogo'],
    queryFn: async ({ signal }) => {
      const [categorias, productos] = await Promise.all([
        api.get<Categoria[]>('/productos/categorias', { signal }),
        api.get<Producto[]>('/productos', { signal }),
      ]);
      const unicos = new Map<string, Producto>();
      for (const producto of productos.data) unicos.set(producto.codigoProducto, producto);
      return { categorias: categorias.data, productos: [...unicos.values()] };
    },
  });

  const analisis = useQuery({
    queryKey: ['analista-resultado', enviados],
    enabled: enviados !== null,
    queryFn: ({ signal }) => obtenerAnalisis(enviados!.filtros, signal),
  });

  const resultado = analisis.data;
  const tieneVentas = Boolean(resultado && resultado.ingresos.datos.length > 0);

  const analizar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEnviados({
      filtros: { ...draft },
      run: Date.now(),
    });
  };

  const actualizar = <K extends keyof FiltrosBorrador>(campo: K, valor: FiltrosBorrador[K]) => {
    setDraft((actual) => ({ ...actual, [campo]: valor }));
  };

  return (
    <main className={`analista-layout${sidebarOpen ? '' : ' analista-layout--collapsed'}`}>
      <aside className={`analista-sidebar${sidebarOpen ? '' : ' analista-sidebar--collapsed'}`}>
        <div className="analista-sidebar__top">
          {sidebarOpen && <BackToStore className="analista-sidebar__back" />}
          <button
            type="button"
            className="analista-sidebar__toggle"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? 'Contraer filtros' : 'Expandir filtros'}
            title={sidebarOpen ? 'Contraer filtros' : 'Expandir filtros'}
          >
            <span aria-hidden="true">{sidebarOpen ? '←' : '→'}</span>
          </button>
        </div>

        {sidebarOpen && (
          <form className="analista-filters" onSubmit={analizar}>
            <div>
              <p className="analista-filters__eyebrow">Filtros</p>
              <label className="analista-field">
                <span>Periodo histórico</span>
                <select value={draft.mesesHist} onChange={(event) => actualizar('mesesHist', Number(event.target.value))}>
                  <option value={6}>Últimos 6 meses</option>
                  <option value={12}>Últimos 12 meses</option>
                  <option value={24}>Últimos 24 meses</option>
                  <option value={36}>Últimos 36 meses</option>
                </select>
              </label>
              <label className="analista-field">
                <span>Categoría</span>
                <select value={draft.categoria ?? ''} onChange={(event) => {
                  actualizar('categoria', event.target.value || undefined);
                  actualizar('productoId', undefined);
                }}>
                  <option value="">Todas</option>
                  {(catalogo.data?.categorias ?? []).map((categoria) => <option key={categoria.idCategoria} value={categoria.nombre}>{categoria.nombre}</option>)}
                </select>
              </label>
              <label className="analista-field">
                <span>Producto</span>
                <select value={draft.productoId ?? ''} onChange={(event) => actualizar('productoId', event.target.value || undefined)}>
                  <option value="">Todos</option>
                  {(catalogo.data?.productos ?? []).filter((producto) => !draft.categoria || producto.categoria === draft.categoria).map((producto) => (
                    <option key={producto.codigoProducto} value={producto.codigoProducto}>{producto.nombre}</option>
                  ))}
                </select>
              </label>
              <label className="analista-field">
                <span>Meses a proyectar</span>
                <select value={draft.meses} onChange={(event) => actualizar('meses', Number(event.target.value))}>
                  {[1, 3, 6, 12].map((meses) => <option key={meses} value={meses}>{meses} {meses === 1 ? 'mes' : 'meses'}</option>)}
                </select>
              </label>
              {catalogo.isError && <p className="analista-sidebar__error" role="alert">No se pudieron cargar las categorías y productos.</p>}
            </div>
            <button className="analista-submit" type="submit" disabled={analisis.isFetching}>
              <span aria-hidden="true">↗</span>{analisis.isFetching ? 'Analizando…' : 'Analizar'}
            </button>
          </form>
        )}
      </aside>

      {!sidebarOpen && (
        <button
          type="button"
          className="analista-open-filters"
          onClick={() => setSidebarOpen(true)}
          aria-label="Mostrar filtros"
        >
          Mostrar filtros
        </button>
      )}

      <section className="analista-content" aria-labelledby="analista-title">
        <header className="analista-heading">
          <div>
            <p className="analista-heading__crumb">TIENDA-UCN · Administración · Análisis predictivo</p>
            <h1 id="analista-title">Análisis predictivo</h1>
          </div>
        </header>

        {!enviados && <div className="analista-state" role="status">Selecciona los filtros y presiona «Analizar» para generar la predicción.</div>}
        {analisis.isFetching && <div className="analista-state" role="status" aria-live="polite"><span className="analista-spinner" /> Analizando las ventas…</div>}
        {analisis.isError && <div className="analista-state analista-state--error" role="alert">{mensajeErrorAnalisis(analisis.error)}</div>}
        {analisis.isSuccess && !tieneVentas && <div className="analista-state" role="status">No hay ventas completadas para los filtros seleccionados.</div>}
        {resultado && tieneVentas && (
          <>
            <AnalistaKpiCards prediccion={resultado.prediccion} resumen={resultado.resumen} />
            <div className="analista-main-row">
              <AnalistaMainChart resultado={resultado} />
              <AnalistaTopProductsCard prediccion={resultado.prediccion} />
            </div>
            <div className="analista-lower-row">
              <AnalistaForecastTable prediccion={resultado.prediccion} />
              <AnalistaSummaryCard resultado={resultado} />
            </div>
          </>
        )}
      </section>
    </main>
  );
}
