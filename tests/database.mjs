import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';

export function openDatabase(filename=':memory:', legacy=false) {
  const sqlite = new DatabaseSync(filename);
  if (!legacy && sqlite.prepare("SELECT name FROM sqlite_master WHERE name='workspace'").get()) return bind(sqlite);
  sqlite.exec(readFileSync(new URL('../drizzle/0000_workspace.sql', import.meta.url),'utf8'));
  if (legacy) return sqlite;
  migrate(sqlite);
  return bind(sqlite);
}

export function migrate(sqlite) {
  sqlite.exec(readFileSync(new URL('../drizzle/0001_recovery.sql', import.meta.url),'utf8'));
}

export function bind(sqlite) {
  return {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      return {bind(...values) {
        return {
          first: async () => statement.get(...values),
          run: async () => ({meta:{changes:statement.run(...values).changes}})
        };
      }};
    }
  };
}
