import { useNavigate } from 'react-router-dom';

interface BackToStoreProps {
    className?: string;
}

export default function BackToStore({ className = '' }: BackToStoreProps) {
    const navigate = useNavigate();

    return (
        <button
            type="button"
            className={`vcm-btn vcm-btn--surface min-h-10 gap-2 px-4 text-sm shadow-sm ${className}`}
            onClick={() => navigate('/')}
        >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Volver a la tienda
        </button>
    );
}
