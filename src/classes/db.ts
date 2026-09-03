// this is an extensive class shim that allows us to specify a single DB object but use read replicas
// since drizzle does not support it yet.
import { USE_READ_REPLICAS } from "../config";

// however we see fit.
export class ExtendedD1Database implements D1Database {
  DB: D1Database|D1DatabaseSession;
  isReplica: boolean;

  constructor(inDB: D1Database) {
    this.DB = (USE_READ_REPLICAS) ? inDB.withSession() : inDB;
    this.isReplica = USE_READ_REPLICAS;
  }
  prepare(query: string): D1PreparedStatement {
    return this.DB.prepare(query);
  }
  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    return this.DB.batch(statements);
  }
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  withSession(constraintOrBookmark?: D1SessionBookmark | D1SessionConstraint): D1DatabaseSession {
    if (this.DB instanceof D1DatabaseSession) {
      return this.DB;
    }
    return this.DB.withSession(constraintOrBookmark);
  }
  async exec(query: string): Promise<D1ExecResult> {
    if (this.DB instanceof D1DatabaseSession) {
      const results = await this.DB.prepare(query).run();
      return {
        count: results.meta.changes,
        duration: results.meta.duration
      };
    }
    return this.DB.exec(query);
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async dump(): Promise<ArrayBuffer> {
    // this function is deprecated, it should do nothing.
    return new ArrayBuffer();
  }
}