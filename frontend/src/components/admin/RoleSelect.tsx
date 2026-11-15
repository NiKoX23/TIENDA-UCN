import RoleBadge from './RoleBadge';
import { ADMIN_ROLE_LABELS, type AdminRole } from './adminRoles';

interface RoleSelectProps {
  id: string;
  value: AdminRole;
  disabled?: boolean;
  loading?: boolean;
  title?: string;
  disableUserOption?: boolean;
  disableVendorOption?: boolean;
  onChange: (role: AdminRole) => void;
}

export default function RoleSelect({
  id,
  value,
  disabled = false,
  loading = false,
  title,
  disableUserOption = false,
  disableVendorOption = false,
  onChange,
}: RoleSelectProps) {
  return (
    <div
      className={`admin-role-select${disabled ? ' admin-role-select--disabled' : ''}${loading ? ' admin-role-select--loading' : ''}`}
      title={title}
      aria-busy={loading}
    >
      <RoleBadge role={value} />
      {value === 'admin' && (
        <svg className="admin-role-select__lock" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="3.5" y="7" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )}
      {loading ? (
        <span className="admin-role-select__spinner" aria-hidden="true" />
      ) : (
        <svg className="admin-role-select__chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <select
        id={id}
        className="admin-role-select__native"
        value={value}
        disabled={disabled}
        title={title}
        aria-label={`Rol: ${ADMIN_ROLE_LABELS[value]}`}
        onChange={(event) => onChange(event.target.value as AdminRole)}
      >
        {(Object.keys(ADMIN_ROLE_LABELS) as AdminRole[]).map((role) => (
          <option
            key={role}
            value={role}
            disabled={
              (role === 'usuario' && disableUserOption) ||
              (role === 'vendedor' && disableVendorOption)
            }
          >
            {ADMIN_ROLE_LABELS[role]}
          </option>
        ))}
      </select>
    </div>
  );
}
