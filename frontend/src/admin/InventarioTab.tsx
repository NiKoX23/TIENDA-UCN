import { useEffect, useState, type ReactNode } from 'react';
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
    'w-full rounded-xl border border-slate-400/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/60';
const labelCls = 'mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400';
const botonSecundarioCls =
    'rounded-xl border border-slate-400/20 bg-slate-950/60 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-violet-400/50 hover:text-slate-100';
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

function badgeEstado(estado: EstadoInventario) {
    const estilos: Record<EstadoInventario, string> = {
        CRITICO: 'border-red-400/40 bg-red-500/20 text-red-200',
        BAJO: 'border-amber-400/40 bg-amber-500/20 text-amber-200',
        NORMAL: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200',
        ALTO: 'border-cyan-400/40 bg-cyan-500/20 text-cyan-200',
    };
    return `rounded-full border px-2.5 py-1 text-xs font-bold ${estilos[estado]}`;
}

interface ModalProps {
    titulo: string;
    onCerrar: () => void;
    children: ReactNode;
}

function Modal({ titulo, onCerrar, children }: ModalProps) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={onCerrar}
        >
            <div
                className="theme-dark-surface max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-400/20 bg-slate-900 p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-extrabold tracking-tight">{titulo}</h2>
                {children}
            </div>
        </div>
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
                Registra el stock físico actual de la talla {item.talla || 'única'}
                {item.color ? ` (${item.color})` : ''}. Stock mínimo declarado: <span className="font-semibold text-slate-200">{item.stockMinimo}</span>.
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
                talla.trim() === '' ||
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
                        talla: talla.trim() || 'unica',
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
                    <div className="rounded-2xl border border-slate-400/15 bg-slate-950/40 p-4">
                        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Variante inicial</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="talla" className={labelCls}>
                                    Talla *
                                </label>
                                <input id="talla" className={inputCls} value={talla} placeholder="EJ: M o unica" onChange={(e) => setTalla(e.target.value)} />
                            </div>
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

    const invalido = talla.trim() === '' || sku.trim() === '' || !esNumeroValido(stock) || !esNumeroValido(stockMinimo);

    const guardar = async () => {
        setGuardando(true);
        try {
            await onGuardar(item.codigoProducto, {
                talla: talla.trim() || 'unica',
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
                    <div>
                        <label htmlFor="talla" className={labelCls}>
                            Talla *
                        </label>
                        <input id="talla" className={inputCls} value={talla} placeholder="EJ: M o unica" onChange={(e) => setTalla(e.target.value)} />
                    </div>
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

    return (
        <div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                    <button type="button" className={botonPrimarioCls} onClick={() => abrirModal('producto')}>
                        + Nuevo producto
                    </button>
                    <button type="button" className={botonSecundarioCls} onClick={() => void recargar()}>
                        Refrescar
                    </button>
                </div>
                <p className="text-xs text-slate-400">
                    {items.length} {items.length === 1 ? 'fila' : 'filas'} · inicial = stock + vendidas (replica planilla)
                </p>
            </div>

            {error && (
                <p className="mt-4 rounded-full border border-red-400/20 bg-red-950/30 px-4 py-3 text-center text-sm text-red-200">{error}</p>
            )}
            {exito && (
                <p className="mt-4 rounded-full border border-emerald-400/20 bg-emerald-950/30 px-4 py-3 text-center text-sm text-emerald-200">{exito}</p>
            )}

            {cargando ? (
                <div className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-slate-100 before:mb-3 before:block before:h-10 before:w-10 before:rounded-full before:border-2 before:border-slate-400/20 before:border-r-violet-600 before:border-t-violet-300 before:animate-spin">
                    Cargando inventario...
                </div>
            ) : (
                <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-400/15 bg-slate-950/30">
                    <table className="w-full min-w-[1250px] text-left text-sm">
                        <thead className="bg-slate-950/50 text-xs uppercase tracking-wider text-slate-400">
                            <tr>
                                <th className="px-3 py-3">Producto</th>
                                <th className="px-3 py-3">Categoría</th>
                                <th className="px-3 py-3">Talla</th>
                                <th className="px-3 py-3">Color</th>
                                <th className="px-3 py-3">SKU</th>
                                <th className="px-3 py-3 text-right">P. venta</th>
                                <th className="px-3 py-3 text-right">P. TAC</th>
                                <th className="px-3 py-3 text-right">Costo</th>
                                <th className="px-3 py-3 text-right">Vendidas</th>
                                <th className="px-3 py-3 text-right">Inicial</th>
                                <th className="px-3 py-3 text-right">Stock</th>
                                <th className="px-3 py-3 text-right">Stock mín.</th>
                                <th className="px-3 py-3 text-right">Margen</th>
                                <th className="px-3 py-3 text-right">Ing. venta</th>
                                <th className="px-3 py-3 text-right">Ing. TAC</th>
                                <th className="px-3 py-3">Estado</th>
                                <th className="px-3 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-400/10">
                            {items.map((item) => (
                                <tr key={item.sku} className="align-top">
                                    <td className="px-3 py-3">
                                        <p className="font-semibold text-slate-100">{item.nombre}</p>
                                        <p className="text-xs text-slate-400">
                                            {item.codigoProducto}
                                            {!item.activo && (
                                                <span className="ml-1.5 rounded-full bg-slate-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-300">
                                                    inactivo
                                                </span>
                                            )}
                                        </p>
                                    </td>
                                    <td className="px-3 py-3 text-slate-300">{item.categoria}</td>
                                    <td className="px-3 py-3 text-slate-200">{item.talla}</td>
                                    <td className="px-3 py-3 text-slate-300">{item.color ?? '—'}</td>
                                    <td className="px-3 py-3 font-mono text-xs text-slate-200">{item.sku}</td>
                                    <td className="px-3 py-3 text-right text-slate-200">{formatearCLP(item.precioVenta)}</td>
                                    <td className="px-3 py-3 text-right text-slate-300">{formatearCLP(item.precioTac)}</td>
                                    <td className="px-3 py-3 text-right text-slate-300">{formatearCLP(item.costoAdquisicion)}</td>
                                    <td className="px-3 py-3 text-right text-slate-200">{item.vendidas}</td>
                                    <td className="px-3 py-3 text-right text-slate-300">{item.inicial}</td>
                                    <td className={`px-3 py-3 text-right font-extrabold ${item.stock <= item.stockMinimo ? 'text-red-300' : item.stock <= 20 ? 'text-amber-200' : 'text-slate-100'}`}>
                                        {item.stock}
                                    </td>
                                    <td className="px-3 py-3 text-right text-slate-400">{item.stockMinimo}</td>
                                    <td className="px-3 py-3 text-right text-slate-200">{formatearCLP(item.margen)}</td>
                                    <td className="px-3 py-3 text-right text-slate-200">{formatearCLP(item.ingresoVenta)}</td>
                                    <td className="px-3 py-3 text-right text-slate-300">{formatearCLP(item.ingresoTac)}</td>
                                    <td className="px-3 py-3">
                                        <span className={badgeEstado(item.estado)}>{item.estado}</span>
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="flex justify-end gap-1.5">
                                            <button type="button" className={botonSecundarioCls} onClick={() => abrirModal('stock', item)}>
                                                Stock
                                            </button>
                                            <button type="button" className={botonSecundarioCls} onClick={() => abrirModal('producto', item)}>
                                                Editar
                                            </button>
                                            <button type="button" className={botonSecundarioCls} onClick={() => abrirModal('variante', item)}>
                                                + Talla
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {items.length === 0 && (
                        <p className="px-4 py-8 text-center text-sm text-slate-400">Sin productos registrados.</p>
                    )}
                </div>
            )}

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