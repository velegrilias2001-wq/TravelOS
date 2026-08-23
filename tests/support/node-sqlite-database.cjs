const {
  DatabaseSync,
} = require('node:sqlite');

class NodeSQLiteDatabase {
  constructor() {
    this.raw =
      new DatabaseSync(':memory:');

    this.transactionTail =
      Promise.resolve();
  }

  async initialize() {}

  async execAsync(sql) {
    this.raw.exec(sql);
  }

  async execute(
    sql,
    params = [],
  ) {
    this.raw
      .prepare(sql)
      .run(...params);
  }

  async runAsync(
    sql,
    params = [],
  ) {
    return this.raw
      .prepare(sql)
      .run(...params);
  }

  async query(
    sql,
    params = [],
  ) {
    return this.raw
      .prepare(sql)
      .all(...params);
  }

  async getAllAsync(
    sql,
    params = [],
  ) {
    return this.query(
      sql,
      params,
    );
  }

  async queryFirst(
    sql,
    params = [],
  ) {
    return (
      this.raw
        .prepare(sql)
        .get(...params) ??
      null
    );
  }

  async getFirstAsync(
    sql,
    params = [],
  ) {
    return this.queryFirst(
      sql,
      params,
    );
  }

  async transaction(operation) {
    const run =
      this.transactionTail.then(
        async () => {
          this.raw.exec(
            'BEGIN IMMEDIATE;',
          );

          try {
            const result =
              await operation(this);

            this.raw.exec('COMMIT;');

            return result;
          } catch (error) {
            try {
              this.raw.exec(
                'ROLLBACK;',
              );
            } catch {
              // The original failure is more useful.
            }

            throw error;
          }
        },
      );

    this.transactionTail = run.then(
      () => undefined,
      () => undefined,
    );

    return run;
  }

  async withExclusiveTransactionAsync(
    operation,
  ) {
    await this.transaction(
      async () => {
        await operation(this);
      },
    );
  }

  close() {
    this.raw.close();
  }
}

module.exports = {
  NodeSQLiteDatabase,
};
