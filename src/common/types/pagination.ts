export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Wrapper returned by list services so the ResponseInterceptor can detect
 * paginated payloads and place `data` + `meta` in the response envelope.
 */
export class Paginated<T> {
  constructor(
    public readonly data: T[],
    public readonly meta: PaginationMeta,
  ) {}
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages: Number.isFinite(totalPages) ? totalPages : 0,
    hasMore: page * limit < total,
  };
}
