import * as SQLite from 'expo-sqlite';

import type { Database } from './database';
import { migrateDatabase } from './migrations';
import { DATABASE_NAME } from './schema';

export class ExpoSQLiteDatabase implements Database {
  private database: SQLite.SQLiteDatabase | null = null;

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
    operation: () => Promise<T>,
  ): Promise<T> {
    const db = await this.getDatabase();

    let result: T;

    await db.withTransactionAsync(async () => {
      result = await operation();
    });

    return result!;
  }
}

export const travelOSDatabase =
  new ExpoSQLiteDatabase();