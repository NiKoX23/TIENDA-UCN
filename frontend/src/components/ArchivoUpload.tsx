import { useState, type ChangeEvent } from 'react';
import type { ConfiguracionArchivos } from '../services/archivos.service';

interface ArchivoUploadProps {
    id: string;
    tipo: 'imagen' | 'pdf';
    etiqueta: string;
    ayuda?: string;
    archivo: File | null;
    configuracion: ConfiguracionArchivos | null;
    errorConfiguracion?: string;
    alCambiar: (archivo: File | null) => void;
}

const MIME_POR_EXTENSION: Record<string, string> = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    pdf: 'application/pdf',
};

export default function ArchivoUpload({
    id,
    tipo,
    etiqueta,
    ayuda,
    archivo,
    configuracion,
    errorConfiguracion,
    alCambiar,
}: ArchivoUploadProps) {
    const [errorArchivo, setErrorArchivo] = useState('');
    const permitidas = (configuracion?.extensionesPermitidas ?? []).filter(
        (extension) =>
            tipo === 'imagen'
                ? extension === 'png' || extension === 'jpeg'
                : extension === 'pdf',
    );
    const extensionesEntrada = permitidas.flatMap((extension) =>
        extension === 'jpeg' ? ['.jpeg', '.jpg'] : [`.${extension}`],
    );
    const aceptadas = permitidas
        .map((extension) => MIME_POR_EXTENSION[extension])
        .concat(extensionesEntrada);

    const manejarCambio = (evento: ChangeEvent<HTMLInputElement>) => {
        const seleccionado = evento.currentTarget.files?.[0] ?? null;
        if (!seleccionado) {
            setErrorArchivo('');
            alCambiar(null);
            return;
        }

        const extensionOriginal = seleccionado.name.split('.').pop()?.toLowerCase();
        const extension =
            extensionOriginal === 'jpg' ? 'jpeg' : extensionOriginal;
        if (!extension || !permitidas.includes(extension)) {
            setErrorArchivo(
                tipo === 'imagen'
                    ? 'Tipo de archivo no permitido. Selecciona una imagen PNG o JPEG.'
                    : 'Tipo de archivo no permitido. Selecciona un documento PDF.',
            );
            alCambiar(null);
            evento.currentTarget.value = '';
            return;
        }

        if (
            configuracion &&
            seleccionado.size > configuracion.maxSizeMB * 1024 * 1024
        ) {
            setErrorArchivo(
                `El archivo supera el tamaño máximo permitido de ${configuracion.maxSizeMB} MB.`,
            );
            alCambiar(null);
            evento.currentTarget.value = '';
            return;
        }

        setErrorArchivo('');
        alCambiar(seleccionado);
    };

    return (
        <div>
            <label htmlFor={id} className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                {etiqueta}
            </label>
            <label
                htmlFor={id}
                className="flex min-h-12 cursor-pointer flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-slate-400/40 bg-slate-900/30 px-3 py-2 text-sm transition hover:border-violet-400/70"
            >
                <span className="min-w-0 flex-1 truncate text-slate-200">
                    {archivo?.name ?? 'Seleccionar archivo'}
                </span>
                <span className="rounded-lg bg-violet-500/15 px-3 py-1.5 text-xs font-bold text-violet-200">
                    Examinar
                </span>
                <input
                    id={id}
                    className="sr-only"
                    type="file"
                    accept={aceptadas.join(',')}
                    onChange={manejarCambio}
                    disabled={!configuracion || permitidas.length === 0}
                />
            </label>
            {ayuda && <p className="mt-1 text-xs text-slate-400">{ayuda}</p>}
            {configuracion && (
                <p className="mt-1 text-xs text-slate-500">
                    Formatos: {permitidas.map((extension) => extension.toUpperCase()).join(', ') || 'ninguno habilitado'}.
                    {' '}Tamaño máximo: {configuracion.maxSizeMB} MB.
                </p>
            )}
            {errorConfiguracion && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-300">
                    {errorConfiguracion}
                </p>
            )}
            {permitidas.length === 0 && configuracion && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-300">
                    No hay formatos habilitados para este tipo de archivo.
                </p>
            )}
            {errorArchivo && (
                <p role="alert" className="mt-1 text-xs font-medium text-rose-300">
                    {errorArchivo}
                </p>
            )}
        </div>
    );
}
