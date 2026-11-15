import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';

interface RowMenuProps {
  label: string;
  onCopyEmail: () => void;
  onChangeRole?: () => void;
  onDelete?: () => void;
}

export default function RowMenu({
  label,
  onCopyEmail,
  onChangeRole,
  onDelete,
}: RowMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const triggerBounds = trigger.getBoundingClientRect();
      const menuBounds = menu.getBoundingClientRect();
      const margin = 8;
      const placeAbove =
        window.innerHeight - triggerBounds.bottom < menuBounds.height + margin &&
        triggerBounds.top > menuBounds.height + margin;
      const top = placeAbove
        ? triggerBounds.top - menuBounds.height - margin
        : Math.min(
            triggerBounds.bottom + margin,
            window.innerHeight - menuBounds.height - margin,
          );
      const left = Math.max(
        margin,
        Math.min(
          triggerBounds.right - menuBounds.width,
          window.innerWidth - menuBounds.width - margin,
        ),
      );
      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
      menu.style.visibility = 'visible';
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const focusFrame = window.requestAnimationFrame(() => {
      menuRef.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
        ?.focus();
    });
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
    );
    if (items.length === 0) return;
    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? items.length - 1
        : currentIndex < 0
          ? (event.key === 'ArrowDown' ? 0 : items.length - 1)
          : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[nextIndex].focus();
  };

  const runAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div className="admin-row-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="admin-row-menu__trigger"
        aria-label={`Acciones de ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`Acciones de ${label}`}
        onClick={() => setOpen((current) => !current)}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <circle cx="4" cy="10" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="16" cy="10" r="1.5" />
        </svg>
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="admin-row-menu__popover"
          role="menu"
          aria-label={`Acciones de ${label}`}
          onKeyDown={handleMenuKeyDown}
          style={{ top: 0, left: 0, visibility: 'hidden' }}
        >
          <button type="button" role="menuitem" onClick={() => runAction(onCopyEmail)}>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="m4 6 6 5 6-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Copiar correo
          </button>
          {onChangeRole && (
            <button type="button" role="menuitem" onClick={() => runAction(onChangeRole)}>
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Cambiar rol
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              role="menuitem"
              className="admin-row-menu__delete"
              onClick={() => runAction(onDelete)}
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 6h12M8 6V4h4v2m-6 0 .7 10h6.6L14 6m-4 3v4m-2-4v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Borrar usuario
            </button>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
