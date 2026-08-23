import * as SQLite from 'expo-sqlite';

import type {
  Database,
  DatabaseConnection,
} from './database';
import { migrateDatabase } from './migrations';
import { DATABASE_NAME } from './schema';

export class ExpoSQLiteDatabase implements Database {
  private database: SQLite.SQLiteDatabase | null = null;

  private transactionTail: Promise<void> =
    Promise.resolve();

  private async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!this.database) {
      this.database =
        await SQLite.openDatabaseAsync(DATABASE_NAME);
    }

    return this.database;
  }

  async initialize(): Promise<void> {
    const db = await this.getDatabase();

    await migrateDatabase(db);
  }

  async execute(
    sql: string,
    params: unknown[] = [],
  ): Promise<void> {
    const db = await this.getDatabase();

    await db.runAsync(
      sql,
      params as SQLite.SQLiteBindParams,
    );
  }

  async query<T>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const db = await this.getDatabase();

    return db.getAllAsync<T>(
      sql,
      params as SQLite.SQLiteBindParams,
    );
  }

  async queryFirst<T>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T | null> {
    const db = await this.getDatabase();

    return db.getFirstAsync<T>(
      sql,
      params as SQLite.SQLiteBindParams,
    );
  }

  async transaction<T>(
    operation: (
      transaction: DatabaseConnection,
    ) => Promise<T>,
  ): Promise<T> {
    const run = this.transactionTail.then(
      async () => {
        const db = await this.getDatabase();

        let result: T | undefined;

        await db.withExclusiveTransactionAsync(
          async (transaction) => {
            const connection: DatabaseConnection = {
              execute: async (
                sql,
                params = [],
              ) => {
                await transaction.runAsync(
                  sql,
                  params as SQLite.SQLiteBindParams,
                );
              },

              query: <Row>(
                sql: string,
                params: unknown[] = [],
              ) =>
                transaction.getAllAsync<Row>(
                  sql,
                  params as SQLite.SQLiteBindParams,
                ),

              queryFirst: <Row>(
                sql: string,
                params: unknown[] = [],
              ) =>
                transaction.getFirstAsync<Row>(
                  sql,
                  params as SQLite.SQLiteBindParams,
                ),
            };

            result = await operation(
              connection,
            );
          },
        );

        return result as T;
      },
    );

    this.transactionTail = run.then(
      () => undefined,
      () => undefined,
    );

    return run;
  }
}

export const travelOSDatabase =
  new ExpoSQLiteDatabase();
