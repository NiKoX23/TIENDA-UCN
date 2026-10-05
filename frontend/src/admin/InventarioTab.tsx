import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { formatearCLP } from '../utils/precio';
import {
    ajustarStock,
    agregarVariante,
    actualizarProducto,
    crearProducto,
    listarCategorias,
    listarInventario,
    type ActualizarProductoPayload,
    type CategoriaOpcion,
    type EstadoInventario,
    type ItemInventario,
    type NuevoProductoPayload,
    type VariantePayload,
} from '../services/inventario.service';

const inputCls =
    'admin-form-field w-full rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-400/60';
const labelCls = 'mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400';
const botonSecundarioCls =
    'admin-secondary-button rounded-xl px-3 py-2 text-xs font-bold transition hover:border-violet-400/50';
const botonPrimarioCls =
    'rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';

function estadoDe(stock: number): EstadoInventario {
    if (stock <= 5) return 'CRITICO';
    if (stock <= 20) return 'BAJO';
    if (stock <= 50) return 'NORMAL';
    return 'ALTO';
}

function mensajeError(e: unknown): string {
    if (axios.isAxiosError(e)) {
        const msg = (e.response?.data as { message?: string | string[] })?.message;
        if (Array.isArray(msg)) return msg.join(', ');
        if (msg) return msg;
    }
    return 'Ocurrió un error inesperado.';
}

function esNumeroValido(s: string): boolean {
    return s !== '' && Number.isFinite(Number(s)) && Number(s) >= 0;
}

function categoriaUsaTallas(categoria: string | undefined): boolean {
    const normalizada = (categoria ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return ['poleron', 'polera', 'pantalon', 'vestuario', 'ropa'].some((nombre) => normalizada.includes(nombre));
}

type EstadoVisual = 'AGOTADO' | 'CRITICO' | 'BAJO' | 'NORMAL';

function nivelEstado(variantes: ItemInventario[]): EstadoVisual {
    if (variantes.every((item) => item.stock === 0)) return 'AGOTADO';
    if (variantes.some((item) => item.stock > 0 && item.estado === 'CRITICO')) return 'CRITICO';
    if (variantes.some((item) => item.estado === 'BAJO')) return 'BAJO';
    return 'NORMAL';
}

function badgeEstado(estado: EstadoVisual) {
    const estilos = {
        AGOTADO: 'admin-inventory-status--empty',
        CRITICO: 'admin-inventory-status--critical',
        BAJO: 'admin-inventory-status--low',
        NORMAL: 'admin-inventory-status--normal',
    };
    const etiqueta = estado === 'AGOTADO' ? 'Agotado' : estado === 'CRITICO' ? 'Crítico' : estado === 'BAJO' ? 'Bajo' : 'Normal';
    return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${estilos[estado]}`}>
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />{etiqueta}
    </span>;
}

function numero(valor: number) {
    return <span className={valor === 0 ? 'text-slate-400/70 tabular-nums' : 'tabular-nums'}>{valor.toLocaleString('es-CL')}</span>;
}

function BotonExpandir({ abierto, onClick }: { abierto: boolean; onClick: () => void }) {
    return <button type="button" aria-label={abierto ? 'Ocultar variantes' : 'Mostrar variantes'} aria-expanded={abierto}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-400/20 text-slate-500 transition hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        onClick={onClick}>
        <span aria-hidden="true" className={`transition-transform ${abierto ? 'rotate-90' : ''}`}>›</span>
    </button>;
}

interface ModalProps {
    titulo: string;
    onCerrar: () => void;
    children: ReactNode;
}

function Modal({ titulo, onCerrar, children }: ModalProps) {
    return createPortal(
        <div
            className="fixed inset-0 z-[150] grid place-items-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-md"
            onClick={onCerrar}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={titulo}
                className="theme-dark-surface my-auto max-h-[min(90vh,720px)] w-full max-w-md overflow-y-auto rounded-[28px] border border-slate-400/25 bg-slate-900 p-7 shadow-[0_24px_80px_rgba(0,0,0,0.35)] ring-1 ring-white/10 max-[480px]:rounded-2xl max-[480px]:p-5"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-5 flex items-center gap-3">
                    <span className="h-8 w-1.5 rounded-full bg-gradient-to-b from-violet-500 to-cyan-400" aria-hidden="true" />
                    <h2 className="text-xl font-extrabold tracking-tight text-slate-100">{titulo}</h2>
                </div>
                {children}
            </div>
        </div>,
        document.body,
    );
}

interface ModalAjustarStockProps {
    item: ItemInventario;
    onCerrar: () => void;
    onGuardar: (sku: string, stock: number) => void;
}

function ModalAjustarStock({ item, onCerrar, onGuardar }: ModalAjustarStockProps) {
    const [valor, setValor] = useState(String(item.stock));
    const stock = Number(valor);
    const invalido = !esNumeroValido(valor);

    return (
        <Modal titulo={`Ajustar stock · ${item.sku}`} onCerrar={onCerrar}>
            <p className="mt-2 text-sm text-slate-400">
                Registra el stock físico actual{categoriaUsaTallas(item.categoria) ? ` de la talla ${item.talla || 'única'}` : ''}
                {item.color ? ` (${item.color})` : ''}{item.stockMinimo > 0 && <>. Stock mínimo declarado: <span className="font-semibold text-slate-200">{item.stockMinimo}</span></>}.
            </p>
            <div className="mt-4">
                <label htmlFor="stock" className={labelCls}>
                    Nuevo stock
                </label>
                <input
                    id="stock"
                    type="number"
                    min={0}
                    className={inputCls}
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                />
            </div>
            <div className="mt-5 flex justify-end gap-2">
                <button type="button" className={botonSecundarioCls} onClick={onCerrar}>
                    Cancelar
                </button>
                <button type="button" className={botonPrimarioCls} disabled={invalido} onClick={() => onGuardar(item.sku, stock)}>
                    Guardar stock
                </button>
            </div>
        </Modal>
    );
}

interface ModalProductoProps {
    categorias: CategoriaOpcion[];
    item: ItemInventario | null;
    onCerrar: () => void;
    onCrear: (payload: NuevoProductoPayload) => Promise<void>;
    onEditar: (codigoProducto: string, payload: ActualizarProductoPayload) => Promise<void>;
}

function ModalProducto({ categorias, item, onCerrar, onCrear, onEditar }: ModalProductoProps) {
    const esNuevo = !item;
    const [guardando, setGuardando] = useState(false);

    const [nombre, setNombre] = useState(item?.nombre ?? '');
    const [idCategoria, setIdCategoria] = useState(() => {
        const coincidencia = categorias.find((c) => c.nombre === item?.categoria);
        return String(coincidencia?.idCategoria ?? categorias[0]?.idCategoria ?? '');
    });
    const usaTallas = categoriaUsaTallas(categorias.find((categoria) => String(categoria.idCategoria) === idCategoria)?.nombre);
    const [marca, setMarca] = useState(item?.marca ?? '');
    const [descripcion, setDescripcion] = useState('');
    const [imagenUrl, setImagenUrl] = useState('');
    const [activo, setActivo] = useState(item?.activo ?? true);

    const [codigoProducto, setCodigoProducto] = useState('');
    const [talla, setTalla] = useState('');
    const [color, setColor] = useState('');
    const [sku, setSku] = useState('');
    const [stock, setStock] = useState('0');
    const [stockMinimo, setStockMinimo] = useState('0');

    const [costoAdquisicion, setCostoAdquisicion] = useState(String(item?.costoAdquisicion ?? ''));
    const [precioVenta, setPrecioVenta] = useState(String(item?.precioVenta ?? ''));
    const [precioTac, setPrecioTac] = useState(item?.precioTac ? String(item.precioTac) : '');

    const invalido =
        nombre.trim() === '' ||
        idCategoria === '' ||
        !esNumeroValido(costoAdquisicion) ||
        !esNumeroValido(precioVenta) ||
        (precioTac.trim() !== '' && !esNumeroValido(precioTac)) ||
        (esNuevo &&
            (codigoProducto.trim() === '' ||
                (usaTallas && talla.trim() === '') ||
                sku.trim() === '' ||
                !esNumeroValido(stock) ||
                !esNumeroValido(stockMinimo)));

    const guardar = async () => {
        setGuardando(true);
        try {
            if (esNuevo) {
                await onCrear({
                    codigoProducto: codigoProducto.trim(),
                    idCategoria: Number(idCategoria),
                    nombre: nombre.trim(),
                    descripcion: descripcion.trim() || undefined,
                    marca: marca.trim() || undefined,
                    costoAdquisicion: Number(costoAdquisicion),
                    precioVenta: Number(precioVenta),
                    precioTac: precioTac.trim() === '' ? undefined : Number(precioTac),
                    imagenUrl: imagenUrl.trim() || undefined,
                    activo: true,
                    variante: {
                        talla: usaTallas ? talla.trim() : 'unica',
                        color: color.trim() || undefined,
                        sku: sku.trim(),
                        stock: Number(stock),
                        stockMinimo: Number(stockMinimo),
                    },
                });
            } else {
                await onEditar(item.codigoProducto, {
                    idCategoria: Number(idCategoria),
                    nombre: nombre.trim(),
                    descripcion: descripcion.trim() || undefined,
                    marca: marca.trim() || undefined,
                    costoAdquisicion: Number(costoAdquisicion),
                    precioVenta: Number(precioVenta),
                    precioTac: precioTac.trim() === '' ? undefined : Number(precioTac),
                    imagenUrl: imagenUrl.trim() || undefined,
                    activo,
                });
            }
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal titulo={esNuevo ? 'Nuevo producto' : `Editar ${item.codigoProducto}`} onCerrar={onCerrar}>
            <form
                className="mt-4 space-y-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    void guardar();
                }}
            >
                {esNuevo && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="codigoProducto" className={labelCls}>
                                Código *
                            </label>
                            <input id="codigoProducto" className={inputCls} value={codigoProducto} placeholder="EJ: TSH001" onChange={(e) => setCodigoProducto(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="categoria" className={labelCls}>
                                Categoría *
                            </label>
                            <select id="categoria" className={inputCls} value={idCategoria} onChange={(e) => setIdCategoria(e.target.value)}>
                                <option value="" disabled>
                                    Selecciona una categoría
                                </option>
                                {categorias.map((c) => (
                                    <option key={c.idCategoria} value={c.idCategoria}>
                                        {c.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
                {!esNuevo && (
                    <div>
                        <label htmlFor="categoria" className={labelCls}>
                            Categoría *
                        </label>
                        <select id="categoria" className={inputCls} value={idCategoria} onChange={(e) => setIdCategoria(e.target.value)}>
                            {categorias.map((c) => (
                                <option key={c.idCategoria} value={c.idCategoria}>
                                    {c.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label htmlFor="nombre" className={labelCls}>
                        Nombre *
                    </label>
                    <input id="nombre" className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                        <label htmlFor="costoAdquisicion" className={labelCls}>
                            Costo adquisición *
                        </label>
                        <input id="costoAdquisicion" type="number" min={0} className={inputCls} value={costoAdquisicion} onChange={(e) => setCostoAdquisicion(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="precioVenta" className={labelCls}>
                            Precio venta *
                        </label>
                        <input id="precioVenta" type="number" min={0} className={inputCls} value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="precioTac" className={labelCls}>
                            Precio TAC
                        </label>
                        <input id="precioTac" type="number" min={0} className={inputCls} value={precioTac} onChange={(e) => setPrecioTac(e.target.value)} />
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="marca" className={labelCls}>
                            Marca
                        </label>
                        <input id="marca" className={inputCls} value={marca} onChange={(e) => setMarca(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="imagenUrl" className={labelCls}>
                            URL imagen
                        </label>
                        <input id="imagenUrl" className={inputCls} value={imagenUrl} onChange={(e) => setImagenUrl(e.target.value)} />
                    </div>
                </div>

                <div>
                    <label htmlFor="descripcion" className={labelCls}>
                        Descripción
                    </label>
                    <textarea id="descripcion" rows={2} className={inputCls} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
                </div>

                {esNuevo && (
                    <div className="admin-variant-section rounded-2xl p-4">
                        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Variante inicial</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {usaTallas && <div>
                                <label htmlFor="talla" className={labelCls}>
                                    Talla *
                                </label>
                                <input id="talla" className={inputCls} value={talla} placeholder="EJ: M o unica" onChange={(e) => setTalla(e.target.value)} />
                            </div>}
                            <div>
                                <label htmlFor="color" className={labelCls}>
                                    Color
                                </label>
                                <input id="color" className={inputCls} value={color} onChange={(e) => setColor(e.target.value)} />
                            </div>
                            <div>
                                <label htmlFor="sku" className={labelCls}>
                                    SKU *
                                </label>
                                <input id="sku" className={inputCls} value={sku} placeholder="EJ: TSH001-M" onChange={(e) => setSku(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="stock" className={labelCls}>
                                        Stock *
                                    </label>
                                    <input id="stock" type="number" min={0} className={inputCls} value={stock} onChange={(e) => setStock(e.target.value)} />
                                </div>
                                <div>
                                    <label htmlFor="stockMinimo" className={labelCls}>
                                        Stock mín.
                                    </label>
                                    <input id="stockMinimo" type="number" min={0} className={inputCls} value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!esNuevo && (
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                        <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
                        Producto activo (visible en la tienda)
                    </label>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" className={botonSecundarioCls} onClick={onCerrar}>
                        Cancelar
                    </button>
                    <button type="submit" className={botonPrimarioCls} disabled={invalido || guardando}>
                        {guardando ? 'Guardando...' : esNuevo ? 'Crear producto' : 'Guardar cambios'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

interface ModalVarianteProps {
    item: ItemInventario;
    onCerrar: () => void;
    onGuardar: (codigoProducto: string, payload: VariantePayload) => Promise<void>;
}

function ModalVariante({ item, onCerrar, onGuardar }: ModalVarianteProps) {
    const [guardando, setGuardando] = useState(false);
    const [talla, setTalla] = useState('');
    const [color, setColor] = useState('');
    const [sku, setSku] = useState('');
    const [stock, setStock] = useState('0');
    const [stockMinimo, setStockMinimo] = useState('0');
    const usaTallas = categoriaUsaTallas(item.categoria);

    const invalido = (usaTallas && talla.trim() === '') || sku.trim() === '' || !esNumeroValido(stock) || !esNumeroValido(stockMinimo);

    const guardar = async () => {
        setGuardando(true);
        try {
            await onGuardar(item.codigoProducto, {
                talla: usaTallas ? talla.trim() : 'unica',
                color: color.trim() || undefined,
                sku: sku.trim(),
                stock: Number(stock),
                stockMinimo: Number(stockMinimo),
            });
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal titulo={`Agregar variante · ${item.nombre}`} onCerrar={onCerrar}>
            <form
                className="mt-4 space-y-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    void guardar();
                }}
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    {usaTallas && <div>
                        <label htmlFor="talla" className={labelCls}>
                            Talla *
                        </label>
                        <input id="talla" className={inputCls} value={talla} placeholder="EJ: M o unica" onChange={(e) => setTalla(e.target.value)} />
                    </div>}
                    <div>
                        <label htmlFor="color" className={labelCls}>
                            Color
                        </label>
                        <input id="color" className={inputCls} value={color} onChange={(e) => setColor(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="sku" className={labelCls}>
                            SKU *
                        </label>
                        <input id="sku" className={inputCls} value={sku} onChange={(e) => setSku(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="stock" className={labelCls}>
                                Stock *
                            </label>
                            <input id="stock" type="number" min={0} className={inputCls} value={stock} onChange={(e) => setStock(e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="stockMinimo" className={labelCls}>
                                Stock mín.
                            </label>
                            <input id="stockMinimo" type="number" min={0} className={inputCls} value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" className={botonSecundarioCls} onClick={onCerrar}>
                        Cancelar
                    </button>
                    <button type="submit" className={botonPrimarioCls} disabled={invalido || guardando}>
                        {guardando ? 'Guardando...' : 'Agregar variante'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export default function InventarioTab() {
    const [items, setItems] = useState<ItemInventario[]>([]);
    const [categorias, setCategorias] = useState<CategoriaOpcion[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [modal, setModal] = useState<'stock' | 'producto' | 'variante' | null>(null);
    const [seleccion, setSeleccion] = useState<ItemInventario | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState('');
    const [estadoFiltro, setEstadoFiltro] = useState('');
    const [expandidos, setExpandidos] = useState<Set<string>>(() => new Set());
    const [detalle, setDetalle] = useState<ItemInventario[] | null>(null);

    const anunciarExito = (mensaje: string) => {
        setExito(mensaje);
        window.setTimeout(() => setExito(''), 4000);
    };

    useEffect(() => {
        let activo = true;
        Promise.all([listarInventario(), listarCategorias()])
            .then(([inventario, cats]) => {
                if (!activo) return;
                setItems(inventario);
                setCategorias(cats);
            })
            .catch(() => {
                if (activo) setError('No se pudo cargar el inventario. Revisa tu conexión.');
            })
            .finally(() => {
                if (activo) setCargando(false);
            });
        return () => {
            activo = false;
        };
    }, []);

    const recargar = async () => {
        setError('');
        try {
            setItems(await listarInventario());
        } catch {
            setError('No se pudo refrescar el inventario.');
        }
    };

    const abrirModal = (tipo: 'stock' | 'producto' | 'variante', item?: ItemInventario) => {
        setError('');
        setSeleccion(item ?? null);
        setModal(tipo);
    };

    const guardarStock = async (sku: string, stock: number) => {
        setError('');
        try {
            await ajustarStock(sku, stock);
            setItems((actuales) =>
                actuales.map((i) =>
                    i.sku === sku ? { ...i, stock, estado: estadoDe(stock), inicial: stock + i.vendidas } : i,
                ),
            );
            setModal(null);
            anunciarExito(`Stock de ${sku} actualizado a ${stock}.`);
        } catch (e) {
            setError(mensajeError(e));
        }
    };

    const guardarProductoNuevo = async (payload: NuevoProductoPayload) => {
        setError('');
        try {
            await crearProducto(payload);
            setModal(null);
            await recargar();
            anunciarExito(`Producto ${payload.codigoProducto} creado.`);
        } catch (e) {
            setError(mensajeError(e));
        }
    };

    const guardarProductoEditado = async (codigoProducto: string, payload: ActualizarProductoPayload) => {
        setError('');
        try {
            await actualizarProducto(codigoProducto, payload);
            setModal(null);
            await recargar();
            anunciarExito(`Producto ${codigoProducto} actualizado.`);
        } catch (e) {
            setError(mensajeError(e));
        }
    };

    const guardarVariante = async (codigoProducto: string, payload: VariantePayload) => {
        setError('');
        try {
            await agregarVariante(codigoProducto, payload);
            setModal(null);
            await recargar();
            anunciarExito(`Variante ${payload.sku} agregada a ${codigoProducto}.`);
        } catch (e) {
            setError(mensajeError(e));
        }
    };

    const grupos = Array.from(items.reduce((mapa, item) => {
        const variantes = mapa.get(item.codigoProducto) ?? [];
        variantes.push(item);
        mapa.set(item.codigoProducto, variantes);
        return mapa;
    }, new Map<string, ItemInventario[]>()).entries()).map(([codigo, variantes]) => ({
        codigo,
        variantes,
        producto: variantes[0],
        stock: variantes.reduce((total, item) => total + item.stock, 0),
        stockMinimo: variantes.reduce((total, item) => total + item.stockMinimo, 0),
        estado: nivelEstado(variantes),
    }));
    const gruposFiltrados = grupos.filter(({ producto, variantes, estado }) => {
        const termino = busqueda.trim().toLocaleLowerCase('es-CL');
        return (!termino || producto.nombre.toLocaleLowerCase('es-CL').includes(termino) || variantes.some((item) => item.sku.toLocaleLowerCase('es-CL').includes(termino)))
            && (!categoriaFiltro || producto.categoria === categoriaFiltro)
            && (!estadoFiltro || estado === estadoFiltro);
    });
    const variantesCriticas = items.filter((item) => item.stock > 0 && item.estado === 'CRITICO').length;
    const stockTotal = items.reduce((total, item) => total + item.stock, 0);
    const valorInventario = items.reduce((total, item) => total + item.costoAdquisicion * item.stock, 0);
    const alternarExpandido = (codigo: string) => setExpandidos((actuales) => {
        const siguientes = new Set(actuales);
        if (siguientes.has(codigo)) siguientes.delete(codigo);
        else siguientes.add(codigo);
        return siguientes;
    });

    const acciones = (item: ItemInventario, compactas = false, esVariante = true) => (
        <div className={`flex items-center justify-end gap-1 ${compactas ? 'mt-3' : ''}`}>
            <button type="button" aria-label={esVariante ? `Ajustar stock de ${item.sku}` : `Ver stock de ${item.nombre}`} title="Stock" className="admin-secondary-button grid h-7 w-7 place-items-center rounded-md text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]" onClick={() => esVariante ? abrirModal('stock', item) : alternarExpandido(item.codigoProducto)}>{esVariante ? '↕' : '▤'}</button>
            <button type="button" aria-label={`Editar ${item.nombre}`} title="Editar producto" className="admin-secondary-button grid h-7 w-7 place-items-center rounded-md text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]" onClick={() => abrirModal('producto', item)}>✎</button>
            <button type="button" aria-label={`Agregar variante a ${item.nombre}`} title="Agregar variante" className="admin-secondary-button grid h-7 w-7 place-items-center rounded-md text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]" onClick={() => abrirModal('variante', item)}>+</button>
        </div>
    );

    const subtablaVariantes = (variantes: ItemInventario[]) => (
        <div className="overflow-x-auto border-t border-slate-400/10 bg-slate-500/[0.035] px-4 py-2">
            <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="text-center text-[11px] text-[var(--text-soft)]"><tr>
                    <th className="px-2 py-2 font-medium">Talla</th><th className="px-2 py-2 font-medium">Color</th><th className="px-2 py-2 font-medium">SKU</th>
                    <th className="px-2 py-2 font-medium">Stock</th><th className="px-2 py-2 font-medium">Acciones</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-400/10">{variantes.map((item) => <tr key={item.sku}>
                    <td className="whitespace-nowrap px-2 py-2.5">{item.talla && item.talla.toLowerCase() !== 'unica' ? item.talla : (!item.color ? 'Única' : '')}</td>
                    <td className="whitespace-nowrap px-2 py-2.5">{item.color || <span className="text-slate-400/60">Vacío</span>}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 font-mono">{item.sku}</td>
                    <td className="px-2 py-2.5 text-right">{numero(item.stock)}{item.stock === 0 && <span className="ml-2 rounded-full border border-slate-400/25 bg-slate-400/10 px-2 py-0.5 text-[10px] font-semibold text-slate-400">Agotado</span>}</td>
                    <td className="px-2 py-2.5">{acciones(item)}</td>
                </tr>)}</tbody>
            </table>
        </div>
    );

    return (
        <div className="mt-6 space-y-5">
            <section aria-label="Resumen del inventario" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    { etiqueta: 'Productos', valor: grupos.length.toLocaleString('es-CL') },
                    { etiqueta: 'Variantes críticas', valor: variantesCriticas.toLocaleString('es-CL') },
                    { etiqueta: 'Stock total', valor: stockTotal.toLocaleString('es-CL') },
                    { etiqueta: 'Valor del inventario', valor: formatearCLP(valorInventario) },
                ].map(({ etiqueta, valor }) => <div key={etiqueta} className="rounded-lg border border-slate-400/15 bg-slate-500/[0.035] px-4 py-3">
                    <p className="text-xs text-slate-400">{etiqueta}</p><p className="mt-1 text-lg font-semibold tabular-nums text-[var(--text)]">{valor}</p>
                </div>)}
            </section>

            <section aria-label="Herramientas de inventario" className="flex flex-wrap items-center gap-2">
                <input aria-label="Buscar por nombre o SKU" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar producto o SKU" className={`${inputCls} min-w-[210px] flex-1 rounded-md`} />
                <select aria-label="Filtrar por categoría" value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} className={`${inputCls} w-full rounded-md sm:w-auto`}>
                    <option value="">Todas las categorías</option>{categorias.map((categoria) => <option key={categoria.idCategoria} value={categoria.nombre}>{categoria.nombre}</option>)}
                </select>
                <select aria-label="Filtrar por estado de stock" value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className={`${inputCls} w-full rounded-md sm:w-auto`}>
                    <option value="">Todos los estados</option><option value="AGOTADO">Agotado</option><option value="CRITICO">Crítico</option><option value="BAJO">Bajo</option><option value="NORMAL">Normal</option>
                </select>
                <button type="button" className={`${botonPrimarioCls} rounded-md`} onClick={() => abrirModal('producto')}>Nuevo producto</button>
                <button type="button" className={`${botonSecundarioCls} rounded-md`} onClick={() => void recargar()}>Refrescar</button>
                <p aria-live="polite" className="w-full text-xs text-slate-400 sm:ml-auto sm:w-auto">{gruposFiltrados.length} {gruposFiltrados.length === 1 ? 'producto' : 'productos'}</p>
            </section>

            {error && (
                <p className="mt-4 rounded-full border border-red-400/20 bg-red-950/30 px-4 py-3 text-center text-sm text-red-200">{error}</p>
            )}
            {exito && (
                <p className="mt-4 rounded-full border border-emerald-400/20 bg-emerald-950/30 px-4 py-3 text-center text-sm text-emerald-200">{exito}</p>
            )}

            {cargando ? (
                <div role="status" aria-label="Cargando inventario" className="space-y-2 rounded-lg border border-slate-400/15 p-4">
                    {[0, 1, 2, 3].map((fila) => <div key={fila} className="ucn-skeleton h-12 w-full" />)}
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border border-slate-400/15 bg-slate-950/10">
                    <table className="hidden w-full table-fixed text-left text-sm md:table">
                        <colgroup><col className="w-[27%]" /><col className="hidden w-[15%] lg:table-column" /><col className="hidden w-[9%] xl:table-column" /><col className="w-[17%]" /><col className="w-[14%]" /><col className="w-[10%]" /><col className="w-[8%]" /></colgroup>
                        <thead className="border-b border-slate-400/15 text-center text-xs text-[var(--text-soft)]">
                            <tr>
                                <th className="px-3 py-3 font-medium">Producto</th><th className="hidden px-3 py-3 font-medium lg:table-cell">Categoría</th>
                                <th className="hidden px-3 py-3 font-medium xl:table-cell">Variantes</th><th className="px-3 py-3 font-medium">Stock</th>
                                <th className="px-3 py-3 font-medium">Precio de venta</th><th className="px-3 py-3 font-medium">Estado</th>
                                <th className="sticky right-0 bg-[var(--bg-950)] px-2 py-3 font-medium">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-400/10">
                            {gruposFiltrados.map(({ codigo, variantes, producto, stock, stockMinimo, estado }) => <>
                                <tr key={codigo} className="h-14 transition-colors hover:bg-slate-500/[0.04]">
                                    <td className="px-3 py-2"><div className="flex min-w-0 items-center gap-2">
                                        <BotonExpandir abierto={expandidos.has(codigo)} onClick={() => alternarExpandido(codigo)} />
                                        <button type="button" className="min-w-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]" onClick={() => setDetalle(variantes)}>
                                            <span className="block truncate font-medium text-[var(--text)]">{producto.nombre}</span><span className="block truncate text-xs text-slate-400">{codigo}{!producto.activo && ' · Inactivo'}</span>
                                        </button>
                                    </div></td>
                                    <td className="hidden truncate px-3 py-2 text-sm text-slate-400 lg:table-cell">{producto.categoria}</td>
                                    <td className="hidden px-3 py-2 text-right text-slate-400 xl:table-cell">{numero(variantes.length)}</td>
                                    <td className="px-3 py-2"><div className="flex items-center gap-2"><span className="w-8 text-right font-medium tabular-nums">{numero(stock)}</span>{stockMinimo > 0 && <span className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-slate-400/15" aria-label={`Stock ${stock} respecto al mínimo ${stockMinimo}`}><span className={`block h-full rounded-full ${estado === 'AGOTADO' || estado === 'CRITICO' ? 'bg-red-400' : estado === 'BAJO' ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(stock / stockMinimo * 100, 100)}%` }} /></span>}</div></td>
                                    <td className="px-3 py-2 text-right"><span className="block whitespace-nowrap tabular-nums">{formatearCLP(producto.precioVenta)}</span><span className="block whitespace-nowrap text-xs text-slate-400">TAC {formatearCLP(producto.precioTac)}</span></td>
                                    <td className="px-3 py-2">{badgeEstado(estado)}</td>
                                    <td className="sticky right-0 bg-[var(--bg-950)] px-2 py-2">{acciones(producto, false, false)}</td>
                                </tr>
                                {expandidos.has(codigo) && <tr key={`${codigo}-variants`}><td colSpan={7} className="p-0">{subtablaVariantes(variantes)}</td></tr>}
                            </>)}
                        </tbody>
                    </table>
                    <div className="space-y-3 p-3 md:hidden">{gruposFiltrados.map(({ codigo, variantes, producto, stock, stockMinimo, estado }) => <article key={codigo} className="rounded-md border border-slate-400/15 p-3">
                        <div className="flex items-start gap-2"><BotonExpandir abierto={expandidos.has(codigo)} onClick={() => alternarExpandido(codigo)} /><button type="button" className="min-w-0 flex-1 text-left" onClick={() => setDetalle(variantes)}><span className="block truncate font-medium">{producto.nombre}</span><span className="block text-xs text-slate-400">{codigo} · {variantes.length} {variantes.length === 1 ? 'variante' : 'variantes'}</span></button>{badgeEstado(estado)}</div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-sm"><span className="text-slate-400">Stock</span><span className="tabular-nums">{numero(stock)}</span></div>
                        {stockMinimo > 0 && <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-400/15"><span className={`block h-full ${estado === 'AGOTADO' || estado === 'CRITICO' ? 'bg-red-400' : estado === 'BAJO' ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(stock / stockMinimo * 100, 100)}%` }} /></div>}
                        <div className="mt-3 flex justify-between gap-3 text-sm"><span className="text-slate-400">{producto.categoria}</span><span className="text-right tabular-nums">{formatearCLP(producto.precioVenta)}<span className="block text-xs text-slate-400">TAC {formatearCLP(producto.precioTac)}</span></span></div>
                        {acciones(producto, true, false)}{expandidos.has(codigo) && subtablaVariantes(variantes)}
                    </article>)}</div>
                    {gruposFiltrados.length === 0 && <p className="px-4 py-10 text-center text-sm text-slate-400">{items.length === 0 ? 'Aún no hay productos en el inventario.' : 'No hay productos que coincidan con estos filtros.'}</p>}
                </div>
            )}

            {detalle && detalle.length > 0 && createPortal(<div className="fixed inset-0 z-[140] flex justify-end bg-slate-950/45" onClick={() => setDetalle(null)}>
                <aside role="dialog" aria-modal="true" aria-label={`Detalle de ${detalle[0].nombre}`} className="theme-dark-surface h-full w-full max-w-md overflow-y-auto border-l border-slate-400/20 bg-[var(--bg-900)] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">{detalle[0].nombre}</h2><p className="mt-1 text-sm text-slate-400">{detalle[0].codigoProducto}</p></div><button type="button" aria-label="Cerrar detalle" className="admin-secondary-button h-8 w-8 rounded-md" onClick={() => setDetalle(null)}>×</button></div>
                    <dl className="mt-6 grid grid-cols-2 gap-3">{[
                        ['Costo', formatearCLP(detalle[0].costoAdquisicion)], ['Margen', formatearCLP(detalle[0].margen)],
                        ['Vendidas', detalle.reduce((total, item) => total + item.vendidas, 0).toLocaleString('es-CL')], ['Stock inicial', detalle.reduce((total, item) => total + item.inicial, 0).toLocaleString('es-CL')],
                        ['Ingresos por venta', formatearCLP(detalle.reduce((total, item) => total + item.ingresoVenta, 0))], ['Ingresos por TAC', formatearCLP(detalle.reduce((total, item) => total + item.ingresoTac, 0))],
                    ].map(([etiqueta, valor]) => <div key={etiqueta} className="rounded-md border border-slate-400/15 p-3"><dt className="text-xs text-slate-400">{etiqueta}</dt><dd className="mt-1 font-medium tabular-nums">{valor}</dd></div>)}</dl>
                </aside>
            </div>, document.body)}

            {modal === 'stock' && seleccion && (
                <ModalAjustarStock item={seleccion} onCerrar={() => setModal(null)} onGuardar={(sku, stock) => void guardarStock(sku, stock)} />
            )}
            {modal === 'producto' && (
                <ModalProducto
                    categorias={categorias}
                    item={seleccion}
                    onCerrar={() => setModal(null)}
                    onCrear={guardarProductoNuevo}
                    onEditar={guardarProductoEditado}
                />
            )}
            {modal === 'variante' && seleccion && (
                <ModalVariante item={seleccion} onCerrar={() => setModal(null)} onGuardar={guardarVariante} />
            )}
        </div>
    );
}
