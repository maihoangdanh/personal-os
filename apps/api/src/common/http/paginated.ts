/**
 * Marker wrapper so the ResponseInterceptor can place pagination info into the
 * top-level `meta` of the response envelope instead of nesting it inside `data`.
 */
export class Paginated<T> {
  constructor(
    public readonly data: T,
    public readonly meta: Record<string, unknown>,
  ) {}
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
