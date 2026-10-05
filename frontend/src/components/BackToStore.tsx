import { useNavigate } from 'react-router-dom';

interface BackToStoreProps {
    className?: string;
}

export default function BackToStore({ className = '' }: BackToStoreProps) {
    const navigate = useNavigate();

    return (
        <button
            type="button"
            className={`storefront-detail-back-button inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-400/20 px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${className}`}
            onClick={() => navigate('/')}
        >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Volver a la tienda
        </button>
    );
}