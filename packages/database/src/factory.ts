import { Store } from "./store";
import { PostgresStore } from "./postgres";
import { InMemoryStore } from "./inmemory";

export function createStore(opts?: { databaseUrl?: string; memory?: boolean }): Store {
  const url = opts?.databaseUrl ?? process.env.DATABASE_URL;
  if (url && !opts?.memory) {
    return new PostgresStore(url);
  }
  return new InMemoryStore();
}

export function isPostgresStore(s: Store): s is PostgresStore {
  return s instanceof PostgresStore;
}
