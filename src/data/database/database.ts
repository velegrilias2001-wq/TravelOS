export interface Database {
  initialize(): Promise<void>;

  execute(
    sql: string,
    params?: unknown[],
  ): Promise<void>;

  query<T>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]>;

  queryFirst<T>(
    sql: string,
    params?: unknown[],
  ): Promise<T | null>;

  transaction<T>(
    operation: () => Promise<T>,
  ): Promise<T>;
}