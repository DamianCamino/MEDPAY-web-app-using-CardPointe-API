/**
 * In-memory transaction store.
 * Replace with Postgres/Mongo when deploying to production.
 */

const transactions = new Map();

function save(record) {
  const id = record.retref || record.id;
  transactions.set(id, { ...record, updatedAt: new Date() });
  return transactions.get(id);
}

function findByRetref(retref) {
  return transactions.get(retref);
}

function findByGhlTransactionId(ghlTransactionId) {
  for (const tx of transactions.values()) {
    if (tx.ghlTransactionId === ghlTransactionId) return tx;
  }
  return undefined;
}

function update(retref, patch) {
  const existing = transactions.get(retref);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch, updatedAt: new Date() };
  transactions.set(retref, updated);
  return updated;
}

function list() {
  return [...transactions.values()];
}

function clear() {
  transactions.clear();
}

module.exports = {
  save,
  findByRetref,
  findByGhlTransactionId,
  update,
  list,
  clear,
};
