/* Minimal in-memory stand-in for `pg`, enough to exercise store-pg.js:
   the one row, the rev column, and the conditional update. */
let table = null;   // { doc, rev }
class Pool {
  constructor(cfg) { this.cfg = cfg; this.ended = false; }
  async query(sql, params) {
    if (/create table/i.test(sql)) return { rows: [] };
    if (/^select/i.test(sql)) return { rows: table ? [{ doc: JSON.parse(JSON.stringify(table.doc)), rev: table.rev }] : [] };
    if (/^insert/i.test(sql)) { if (!table) table = { doc: JSON.parse(params[1]), rev: 0 }; return { rows: [] }; }
    if (/^update/i.test(sql)) {
      const [doc, next, , expected] = params;
      if (!table || Number(table.rev) !== Number(expected)) return { rows: [] };   // stale
      table = { doc: JSON.parse(doc), rev: Number(next) };
      return { rows: [{ rev: next }] };
    }
    return { rows: [] };
  }
  async end() { this.ended = true; }
}
module.exports = { Pool, __peek: () => table, __reset: () => { table = null; } };
