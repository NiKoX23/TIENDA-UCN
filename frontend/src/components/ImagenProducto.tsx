import { useState } from 'react';
import escudoUcn from '../assets/icons/Escudo-UCN.png';
import { esImagenPlaceholder } from '../productos/Productos';

interface ImagenProductoProps {
  src?: string | null;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

/**
 * Imagen de producto. Si el producto no tiene foto (la API entrega sin-imagen.svg)
 * o la imagen no carga, muestra el escudo UCN en su lugar.
 */
export default function ImagenProducto({ src, alt, className = '', loading }: ImagenProductoProps) {
  const [fallaDe, setFallaDe] = useState<string | null>(null);
  const sinImagen = esImagenPlaceholder(src) || fallaDe === src;

  if (sinImagen) {
    return (
      <span className={`vcm-noimage ${className}`} role="img" aria-label={`${alt}: imagen próximamente`}>
        <img src={escudoUcn} alt="" className="vcm-noimage__logo" draggable={false} />
      </span>
    );
  }

  return <img src={src ?? undefined} alt={alt} loading={loading} className={className} onError={() => setFallaDe(src ?? null)} />;
}
