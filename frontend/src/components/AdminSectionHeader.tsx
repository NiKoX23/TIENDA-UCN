import type { ReactNode } from 'react';

interface AdminSectionHeaderProps {
  titulo: string;
  descripcion?: string;
  children?: ReactNode;
  className?: string;
}

export default function AdminSectionHeader({
  titulo,
  descripcion,
  children,
  className = '',
}: AdminSectionHeaderProps) {
  return (
    <header className={`vcm-admin-section-header ${className}`}>
      <div className="vcm-admin-section-heading">
        <h2 className="vcm-section-title">{titulo}</h2>
        {descripcion && <p className="vcm-admin-section-description">{descripcion}</p>}
      </div>
      {children && <div className="vcm-admin-section-controls">{children}</div>}
    </header>
  );
}
