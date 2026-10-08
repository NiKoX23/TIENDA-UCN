import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { formatearCLP } from '../utils/precio';
import {
    ajustarStock,
    actualizarVariante,
    agregarVariante,
        type ActualizarVariantePayload,
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

type EstadoVisual = 'AGOTADO' | 'CRITICO' | 'BAJO' | 'NORMAL' | 'ALTO';

function estadoVisualVariante(item: ItemInventario): EstadoVisual {
    if (item.stock === 0) return 'AGOTADO';
    return item.estado;
}

function porcentajeBarraStock(stock: number, stockMinimo: number): number {
    const escala = Math.max(stockMinimo, 50);
    return Math.min((stock / escala) * 100, 100);
}

function nivelEstado(variantes: ItemInventario[]): EstadoVisual {
    if (variantes.every((item) => item.stock === 0)) return 'AGOTADO';
    if (variantes.some((item) => item.stock > 0 && item.estado === 'CRITICO')) return 'CRITICO';
    if (variantes.some((item) => item.estado === 'BAJO')) return 'BAJO';
    if (variantes.every((item) => item.estado === 'ALTO')) return 'ALTO';
    return 'NORMAL';
}

function badgeEstado(estado: EstadoVisual) {
    const estilos = {
        AGOTADO: 'admin-inventory-status--empty',
        CRITICO: 'admin-inventory-status--critical',
        BAJO: 'admin-inventory-status--low',
        NORMAL: 'admin-inventory-status--normal',
        ALTO: 'admin-inventory-status--high',
    };
    const etiqueta = estado === 'AGOTADO' ? 'Agotado' : estado === 'CRITICO' ? 'Crítico' : estado === 'BAJO' ? 'Bajo' : estado === 'ALTO' ? 'Alto' : 'Normal';
    return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${estilos[estado]}`}>
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />{etiqueta}
    </span>;
}

function numero(valor: number) {
    return <span className={valor === 0 ? 'text-slate-400/70 tabular-nums' : 'tabular-nums'}>{valor.toLocaleString('es-CL')}</span>;
}

function nombreVisibleVariante(item: ItemInventario): string {
    const color = item.color?.trim().toLocaleLowerCase('es-CL');
    const talla = item.talla && item.talla.toLocaleLowerCase('es-CL') !== 'unica'
        ? `Talla ${item.talla}`
        : '';
    return [item.nombre, color, talla].filter(Boolean).join(' · ');
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
    const [descripcion, setDescripcion] = useState(item?.descripcion ?? '');
    const [imagenUrl, setImagenUrl] = useState(item?.imagenUrlProducto ?? '');
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
                    descripcion: descripcion.trim(),
                    marca: marca.trim(),
                    costoAdquisicion: Number(costoAdquisicion),
                    precioVenta: Number(precioVenta),
                    precioTac: precioTac.trim() === '' ? undefined : Number(precioTac),
                    imagenUrl: imagenUrl.trim(),
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

interface ModalEditarVarianteProps {
    item: ItemInventario;
    onCerrar: () => void;
    onGuardar: (sku: string, payload: ActualizarVariantePayload) => Promise<void>;
}

function ModalEditarVariante({ item, onCerrar, onGuardar }: ModalEditarVarianteProps) {
    const [guardando, setGuardando] = useState(false);
    const [talla, setTalla] = useState(item.talla);
    const [color, setColor] = useState(item.color ?? '');
    const [imagenUrl, setImagenUrl] = useState(item.imagenVarianteUrl ?? '');
    const [stock, setStock] = useState(String(item.stock));
    const invalido = talla.trim() === '' || !esNumeroValido(stock) || !Number.isInteger(Number(stock));

    const guardar = async () => {
        setGuardando(true);
        try {
            await onGuardar(item.sku, {
                talla: talla.trim(),
                color: color.trim(),
                imagenUrl: imagenUrl.trim(),
                stock: Number(stock),
            });
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal titulo={`Editar variante · ${item.nombre}`} onCerrar={onCerrar}>
            <form className="mt-4 space-y-4" onSubmit={(event) => { event.preventDefault(); void guardar(); }}>
                <p className="text-sm text-[var(--text-soft)]">SKU: <strong>{item.sku}</strong> · Stock actual: <strong>{item.stock}</strong></p>
                                <p className="text-sm text-[var(--text-soft)]">SKU: <strong>{item.sku}</strong></p>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="editar-talla" className={labelCls}>Talla / variante *</label>
                        <input id="editar-talla" className={inputCls} maxLength={10} value={talla} onChange={(event) => setTalla(event.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="editar-color" className={labelCls}>Color</label>
                        <input id="editar-color" className={inputCls} maxLength={30} value={color} onChange={(event) => setColor(event.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="editar-imagen-variante" className={labelCls}>URL de imagen de variante</label>
                        <input id="editar-imagen-variante" className={inputCls} maxLength={200} value={imagenUrl} onChange={(event) => setImagenUrl(event.target.value)} placeholder="Vacío: usar imagen del producto" />
                        {imagenUrl && <img src={imagenUrl} alt={`Vista previa de ${item.nombre}`} className="mt-2 h-24 w-full rounded-lg border border-slate-400/20 bg-white object-contain p-2" />}
                    </div>
                    <div>
                        <label htmlFor="editar-stock-actual" className={labelCls}>Stock actual</label>
                        <input id="editar-stock-actual" type="number" min={0} step={1} className={inputCls} value={stock} onChange={(event) => setStock(event.target.value)} />
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" className={botonSecundarioCls} onClick={onCerrar}>Cancelar</button>
                    <button type="submit" className={botonPrimarioCls} disabled={invalido || guardando}>{guardando ? 'Guardando...' : 'Guardar variante'}</button>
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
    const [modal, setModal] = useState<'stock' | 'producto' | 'variante' | 'editar-variante' | null>(null);
    const [seleccion, setSeleccion] = useState<ItemInventario | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState('');
    const [estadoFiltro, setEstadoFiltro] = useState('');
    const [expandidos, setExpandidos] = useState<Set<string>>(() => new Set());
    const [detalle, setDetalle] = useState<ItemInventario[] | null>(null);
    const [detalleSkuSeleccionado, setDetalleSkuSeleccionado] = useState('');
    const [selectorVariantesAbierto, setSelectorVariantesAbierto] = useState(false);

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
            const inventario = await listarInventario();
            setItems(inventario);
            setDetalle((actualDetalle) => actualDetalle?.length
                ? inventario.filter((item) => item.codigoProducto === actualDetalle[0].codigoProducto)
                : null);
        } catch {
            setError('No se pudo refrescar el inventario.');
        }
    };

    const abrirModal = (tipo: 'stock' | 'producto' | 'variante', item?: ItemInventario) => {
        setError('');
        setSeleccion(item ?? null);
        setModal(tipo);
    };

    const abrirDetalle = (variantes: ItemInventario[]) => {
        setDetalle(variantes);
        setDetalleSkuSeleccionado(variantes[0]?.sku ?? '');
        setSelectorVariantesAbierto(false);
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
            setDetalle((actuales) => actuales?.map((i) =>
                i.sku === sku ? { ...i, stock, estado: estadoDe(stock), inicial: stock + i.vendidas } : i,
            ) ?? null);
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

    const guardarVarianteEditada = async (sku: string, payload: ActualizarVariantePayload) => {
        setError('');
        try {
            await actualizarVariante(sku, payload);
            setModal(null);
            await recargar();
            anunciarExito(`Variante ${sku} actualizada.`);
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
    const varianteDetalle = detalle?.find((item) => item.sku === detalleSkuSeleccionado) ?? detalle?.[0] ?? null;
    const stockDetalle = varianteDetalle?.stock ?? 0;
    const inicialDetalle = varianteDetalle?.inicial ?? 0;
    const vendidasDetalle = varianteDetalle?.vendidas ?? 0;
    const minimoDetalle = varianteDetalle?.stockMinimo ?? 0;
    const ingresosVentaDetalle = varianteDetalle?.ingresoVenta ?? 0;
    const ingresosTacDetalle = varianteDetalle?.ingresoTac ?? 0;
    const porcentajeStockDetalle = inicialDetalle > 0 ? Math.min(stockDetalle / inicialDetalle * 100, 100) : 0;
    const stockTotal = items.reduce((total, item) => total + item.stock, 0);
    const valorInventario = items.reduce((total, item) => total + item.costoAdquisicion * item.stock, 0);
    const alternarExpandido = (codigo: string) => setExpandidos((actuales) => {
        const siguientes = new Set(actuales);
        if (siguientes.has(codigo)) siguientes.delete(codigo);
        else siguientes.add(codigo);
        return siguientes;
    });

    const editarDetalle = () => {
        if (!varianteDetalle) return;
        setDetalle(null);
        abrirModal('producto', varianteDetalle);
    };

    const editarVarianteDetalle = () => {
        if (!varianteDetalle || !detalle || detalle.length < 2) return;
        setError('');
        setSeleccion(varianteDetalle);
        setModal('editar-variante');
    };

    const ajustarDetalle = () => {
        if (!varianteDetalle) return;
        setDetalle(null);
        abrirModal('stock', varianteDetalle);
    };

    const acciones = (item: ItemInventario, compactas = false, esVariante = true) => (
        <div className={`flex items-center justify-end gap-1 ${compactas ? 'mt-3' : ''}`}>
            <button type="button" aria-label={esVariante ? `Ajustar stock de ${item.sku}` : `Ver stock de ${item.nombre}`} title="Stock" className="admin-secondary-button grid h-7 w-7 place-items-center rounded-md text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]" onClick={() => esVariante ? abrirModal('stock', item) : alternarExpandido(item.codigoProducto)}>{esVariante ? '↕' : '▤'}</button>
            <button type="button" aria-label={`Editar ${item.nombre}`} title="Editar producto" className="admin-secondary-button grid h-7 w-7 place-items-center rounded-md text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]" onClick={() => abrirModal('producto', item)}>✎</button>
            <button type="button" aria-label={`Agregar variante a ${item.nombre}`} title="Agregar variante" className="admin-secondary-button grid h-7 w-7 place-items-center rounded-md text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]" onClick={() => abrirModal('variante', item)}>+</button>
        </div>
    );

    const subtablaVariantes = (variantes: ItemInventario[]) => (
        <div className="overflow-x-auto border-t border-slate-400/10 bg-slate-500/[0.035] px-4 py-2">
            <table className="w-full min-w-[560px] text-center text-xs">
                <thead className="text-center text-[11px] text-[var(--text-soft)]"><tr>
                    <th className="px-2 py-2 font-medium">Talla</th><th className="px-2 py-2 font-medium">Color</th><th className="px-2 py-2 font-medium">SKU</th>
                    <th className="px-2 py-2 font-medium">Stock y nivel</th><th className="px-2 py-2 font-medium">Acciones</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-400/10">{variantes.map((item) => <tr key={item.sku}>
                    <td className="whitespace-nowrap px-2 py-2.5 text-center">{item.talla && item.talla.toLowerCase() !== 'unica' ? item.talla : (!item.color ? 'Única' : '')}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-center">{item.color || <span className="text-slate-400/60">Vacío</span>}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-center font-mono">{item.sku}</td>
                    <td className="px-2 py-2.5"><div className="admin-variant-stock-cell"><div className="admin-variant-stock-value">{numero(item.stock)} unidades {badgeEstado(estadoVisualVariante(item))}</div><div className="admin-variant-stock-track" role="progressbar" aria-label={`Stock de ${item.sku}`} aria-valuenow={item.stock} aria-valuemin={0} aria-valuemax={Math.max(item.stockMinimo, 50)}><span className={`admin-stock-bar--${estadoVisualVariante(item).toLowerCase()}`} style={{ width: `${porcentajeBarraStock(item.stock, item.stockMinimo)}%` }} /></div></div></td>
                    <td className="px-2 py-2.5 text-center admin-variant-table-actions">{acciones(item)}</td>
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
                        <thead className="border-b border-slate-400/15 text-center text-sm text-[var(--text-soft)]">
                            <tr>
                                <th className="px-3 py-3 font-medium">Producto</th>
                                <th className="hidden px-3 py-3 text-center font-medium lg:table-cell">Categoría</th>
                                <th className="hidden px-3 py-3 text-center text-sm font-medium xl:table-cell">Variantes</th><th className="px-3 py-3 font-medium">Stock</th>
                                <th className="px-3 py-3 font-medium">Precio de venta</th><th className="px-3 py-3 font-medium">Estado</th>
                                <th className="sticky right-0 bg-[var(--bg-950)] px-2 py-3 font-medium">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-400/10">
                            {gruposFiltrados.map(({ codigo, variantes, producto, stock, stockMinimo, estado }) => <>
                                <tr key={codigo} className="h-14 transition-colors hover:bg-slate-500/[0.04]">
                                    <td className="px-3 py-2"><div className="flex min-w-0 items-center gap-2">
                                        <BotonExpandir abierto={expandidos.has(codigo)} onClick={() => alternarExpandido(codigo)} />
                                        <button type="button" className="min-w-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]" onClick={() => abrirDetalle(variantes)}>
                                            <span className="block truncate font-medium text-[var(--text)]">{producto.nombre}</span><span className="block truncate text-xs text-slate-400">{codigo}{!producto.activo && ' · Inactivo'}</span>
                                        </button>
                                    </div></td>
                                    <td className="hidden truncate px-3 py-2 text-center text-sm text-slate-400 lg:table-cell">{producto.categoria}</td>
                                    <td className="hidden px-3 py-2 text-center text-sm text-slate-400 xl:table-cell">{numero(variantes.length)}</td>
                                    <td className="px-3 py-2">{variantes.length > 1 ? (
                                        <div className="admin-product-stock-summary"><span className="font-medium tabular-nums">{numero(stock)}</span><span className="admin-product-stock-track" role="progressbar" aria-label={`Stock ${stock} del producto`} aria-valuenow={stock} aria-valuemin={0} aria-valuemax={Math.max(stockMinimo, 50)}><span className={`admin-stock-bar--${estado.toLowerCase()}`} style={{ width: `${porcentajeBarraStock(stock, stockMinimo)}%` }} /></span></div>
                                    ) : (
                                        <div className="flex items-center gap-2"><span className="w-8 text-right font-medium tabular-nums">{numero(stock)}</span>{stockMinimo > 0 && <span className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-slate-400/15" aria-label={`Stock ${stock} respecto al mínimo ${stockMinimo}`}><span className={`block h-full rounded-full ${estado === 'AGOTADO' || estado === 'CRITICO' ? 'bg-red-400' : estado === 'BAJO' ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(stock / stockMinimo * 100, 100)}%` }} /></span>}</div>
                                    )}</td>
                                    <td className="px-3 py-2 text-right"><span className="block whitespace-nowrap tabular-nums">{formatearCLP(producto.precioVenta)}</span><span className="block whitespace-nowrap text-xs text-slate-400">TAC {formatearCLP(producto.precioTac)}</span></td>
                                    <td className="px-3 py-2">{badgeEstado(estado)}</td>
                                    <td className="sticky right-0 bg-[var(--bg-950)] px-2 py-2">{acciones(producto, false, false)}</td>
                                </tr>
                                {expandidos.has(codigo) && <tr key={`${codigo}-variants`}><td colSpan={7} className="p-0">{subtablaVariantes(variantes)}</td></tr>}
                            </>)}
                        </tbody>
                    </table>
                    <div className="space-y-3 p-3 md:hidden">{gruposFiltrados.map(({ codigo, variantes, producto, stock, stockMinimo, estado }) => <article key={codigo} className="rounded-md border border-slate-400/15 p-3">
                        <div className="flex items-start gap-2"><BotonExpandir abierto={expandidos.has(codigo)} onClick={() => alternarExpandido(codigo)} /><button type="button" className="min-w-0 flex-1 text-left" onClick={() => abrirDetalle(variantes)}><span className="block truncate font-medium">{producto.nombre}</span><span className="block text-xs text-slate-400">{codigo} · {variantes.length} {variantes.length === 1 ? 'variante' : 'variantes'}</span></button>{badgeEstado(estado)}</div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-sm"><span className="text-slate-400">Stock</span><span className="tabular-nums">{numero(stock)}</span></div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-sm"><span className="text-slate-400">Stock</span><span className="tabular-nums">{numero(stock)}</span></div>
                        {variantes.length > 1 ? <div className="admin-product-stock-track" role="progressbar" aria-label={`Stock ${stock} del producto`} aria-valuenow={stock} aria-valuemin={0} aria-valuemax={Math.max(stockMinimo, 50)}><span className={`admin-stock-bar--${estado.toLowerCase()}`} style={{ width: `${porcentajeBarraStock(stock, stockMinimo)}%` }} /></div> : stockMinimo > 0 && <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-400/15"><span className={`block h-full ${estado === 'AGOTADO' || estado === 'CRITICO' ? 'bg-red-400' : estado === 'BAJO' ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(stock / stockMinimo * 100, 100)}%` }} /></div>}
                        <div className="mt-3 flex justify-between gap-3 text-sm"><span className="text-slate-400">{producto.categoria}</span><span className="text-right tabular-nums">{formatearCLP(producto.precioVenta)}<span className="block text-xs text-slate-400">TAC {formatearCLP(producto.precioTac)}</span></span></div>
                        {acciones(producto, true, false)}{expandidos.has(codigo) && subtablaVariantes(variantes)}
                    </article>)}</div>
                    {gruposFiltrados.length === 0 && <p className="px-4 py-10 text-center text-sm text-slate-400">{items.length === 0 ? 'Aún no hay productos en el inventario.' : 'No hay productos que coincidan con estos filtros.'}</p>}
                </div>
            )}

            {detalle && detalle.length > 0 && varianteDetalle && createPortal(<div className="admin-product-detail-overlay fixed inset-0 z-[140] flex justify-end" onClick={() => setDetalle(null)}>
                <aside role="dialog" aria-modal="true" aria-label={`Detalle de ${detalle[0].nombre}`} className="admin-product-detail-panel" onClick={(e) => e.stopPropagation()}>
                    <header className="admin-product-detail-header">
                        <div>
                            <p className="admin-product-eyebrow">Inventario / {varianteDetalle.categoria}</p>
                            <h2>{varianteDetalle.nombre}</h2>
                            <div className="admin-product-heading-meta"><span>{varianteDetalle.codigoProducto}</span>{badgeEstado(nivelEstado(detalle))}</div>
                                                    <div className="admin-product-heading-meta"><span>{varianteDetalle.codigoProducto}</span>{badgeEstado(estadoVisualVariante(varianteDetalle))}</div>
                        </div>
                        <button type="button" aria-label="Cerrar detalle" className="admin-product-close" onClick={() => setDetalle(null)}>×</button>
                    </header>

                    <div className="admin-product-detail-scroll">
                        <div className="admin-product-photo-grid">
                            <div className="admin-product-photo-main">
                                {varianteDetalle.imagenUrl ? <img src={varianteDetalle.imagenUrl} alt={varianteDetalle.nombre} /> : <div className="admin-product-photo-placeholder"><span aria-hidden="true">▧</span><span>Sin foto principal</span></div>}
                            </div>
                        </div>

                        {detalle.length > 1 && <section className="admin-product-variant-picker">
                            <div className="admin-product-variant-picker-actions">
                                <button
                                    type="button"
                                    className="admin-product-variant-picker-toggle"
                                    aria-expanded={selectorVariantesAbierto}
                                    aria-controls="admin-product-variant-options"
                                    onClick={() => setSelectorVariantesAbierto((abierto) => !abierto)}
                                >
                                    <span>Seleccionar variante</span>
                                    <strong>{nombreVisibleVariante(varianteDetalle)}</strong>
                                    <span aria-hidden="true">{selectorVariantesAbierto ? '⌃' : '⌄'}</span>
                                </button>
                                <button type="button" className="admin-product-variant-edit-button" onClick={editarVarianteDetalle}>
                                    Editar variante
                                </button>
                            </div>
                            {selectorVariantesAbierto && <div id="admin-product-variant-options" className="admin-product-variant-options">
                                {detalle.map((item) => <button
                                    type="button"
                                    key={item.sku}
                                    aria-pressed={item.sku === varianteDetalle.sku}
                                    onClick={() => {
                                        setDetalleSkuSeleccionado(item.sku);
                                        setSelectorVariantesAbierto(false);
                                    }}
                                >
                                    <span>{nombreVisibleVariante(item)}</span>
                                    <strong>{item.stock} en stock</strong>
                                </button>)}
                            </div>}
                        </section>}

                        <section className="admin-product-description">
                            <h3>Descripción</h3>
                            <p>{varianteDetalle.descripcion || 'Sin descripción para este producto.'}</p>
                        </section>

                        <section className="admin-product-price">
                            <div className="admin-product-price-heading"><div><span>Precio de venta</span><strong>{formatearCLP(varianteDetalle.precioVenta)}</strong></div></div>
                            <div className="admin-product-costs"><div><span>Precio TAC</span><strong>{formatearCLP(varianteDetalle.precioTac)}</strong></div><div><span>Costo</span><strong>{formatearCLP(varianteDetalle.costoAdquisicion)}</strong></div></div>
                        </section>

                        <section className="admin-product-stock">
                            <div className="admin-product-stock-heading"><span>Stock disponible</span><span>Inicial {inicialDetalle.toLocaleString('es-CL')} · Vendidas {vendidasDetalle.toLocaleString('es-CL')}</span></div>
                                                        <div className="admin-product-stock-heading"><span>Stock disponible · {badgeEstado(estadoVisualVariante(varianteDetalle))}</span><span>Inicial {inicialDetalle.toLocaleString('es-CL')} · Vendidas {vendidasDetalle.toLocaleString('es-CL')}</span></div>
                            <p><strong>{stockDetalle.toLocaleString('es-CL')}</strong> unidades</p>
                            <div className="admin-product-stock-track" role="progressbar" aria-label="Stock disponible respecto al inicial" aria-valuenow={stockDetalle} aria-valuemin={0} aria-valuemax={Math.max(inicialDetalle, stockDetalle)}><span style={{ width: `${porcentajeStockDetalle}%` }} /></div>
                            {minimoDetalle > 0 && <span className="admin-product-min-stock">Stock mínimo {minimoDetalle.toLocaleString('es-CL')}</span>}
                        </section>

                        <dl className="admin-product-revenue">
                            <div><dt>Ingresos por venta</dt><dd>{formatearCLP(ingresosVentaDetalle)}</dd></div>
                            <div><dt>Ingresos por TAC</dt><dd>{formatearCLP(ingresosTacDetalle)}</dd></div>
                        </dl>
                    </div>

                    <footer className="admin-product-detail-actions">
                        <button type="button" className="admin-product-edit-action" onClick={editarDetalle}>Editar producto</button>
                        <button type="button" className="admin-product-stock-action" onClick={ajustarDetalle}>+ Ajustar stock</button>
                    </footer>
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
            {modal === 'editar-variante' && seleccion && (
                <ModalEditarVariante item={seleccion} onCerrar={() => setModal(null)} onGuardar={guardarVarianteEditada} />
            )}
        </div>
    );
}
