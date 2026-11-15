import type { ReactNode } from 'react';
import ReservaModal from '../../reservas/ReservaModal';

interface ConfirmModalProps {
  open: boolean;
  titleId: string;
  title: string;
  description: string;
  confirmText: string;
  destructive?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  children?: ReactNode;
}

export default function ConfirmModal({
  open,
  titleId,
  title,
  description,
  confirmText,
  destructive = false,
  loading = false,
  onCancel,
  onConfirm,
  children,
}: ConfirmModalProps) {
  return (
    <ReservaModal
      abierto={open}
      tituloId={titleId}
      descripcionId={`${titleId}-description`}
      onCerrar={onCancel}
      clase="admin-confirm-modal"
    >
      <h2 id={titleId} className="vcm-section-title text-xl font-bold">{title}</h2>
      <p id={`${titleId}-description`} className="mt-2 text-sm text-[var(--text-soft)]">
        {description}
      </p>
      {children}
      <div className="admin-confirm-modal__actions">
        <button
          type="button"
          className="vcm-btn vcm-btn--surface"
          disabled={loading}
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={`vcm-btn ${destructive ? 'vcm-btn--danger' : 'vcm-btn--primary'}`}
          disabled={loading}
          aria-busy={loading}
          onClick={onConfirm}
        >
          {loading ? 'Procesando...' : confirmText}
        </button>
      </div>
    </ReservaModal>
  );
}
