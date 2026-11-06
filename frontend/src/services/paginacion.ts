/** Respuesta de los endpoints paginados del backend. */
export interface PaginaApi<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
