import { ADMIN_ROLE_LABELS, type AdminRole } from './adminRoles';

interface RoleBadgeProps {
  role: AdminRole;
  className?: string;
}

export default function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  return (
    <span className={`admin-role-badge ${className}`} data-role={role}>
      <span className="admin-role-badge__dot" aria-hidden="true" />
      {ADMIN_ROLE_LABELS[role]}
    </span>
  );
}
