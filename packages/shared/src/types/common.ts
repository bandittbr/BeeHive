export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export type Nullable<T> = T | null;
export type Asyncable<T> = T | Promise<T>;

export interface PaginatedQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FileInfo {
  name: string;
  path: string;
  mimeType: string;
  size: number;
  extension: string;
}

export interface DateRange {
  from: number;
  to: number;
}
