export interface DatabaseConnection {
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
}

export interface Database
  extends DatabaseConnection
{
  initialize(): Promise<void>;

  transaction<T>(
    operation: (
      transaction: DatabaseConnection,
    ) => Promise<T>,
  ): Promise<T>;
}
