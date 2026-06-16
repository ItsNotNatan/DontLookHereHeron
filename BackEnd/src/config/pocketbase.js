// src/config/pocketbase.js
// Cliente PocketBase para o backend, autenticando como SUPERUSER (acesso total).
// O PocketBase roda local na maquina (porta 8090); o Express e o unico consumidor.
require('dotenv').config();

const PB = require('pocketbase/cjs');
const PocketBase = PB.default || PB;

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';

const pb = new PocketBase(PB_URL);
pb.autoCancellation(false); // backend: nunca cancelar requisicoes em paralelo

let authPromise = null;

async function ensureAuth() {
  if (pb.authStore.isValid) return;
  if (!authPromise) {
    authPromise = pb
      .collection('_superusers')
      .authWithPassword(process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASSWORD)
      .catch((e) => { authPromise = null; throw e; });
  }
  await authPromise;
}

// Executa uma operacao garantindo auth; se a sessao expirar (401/403), re-autentica 1x.
async function withAuth(fn) {
  await ensureAuth();
  try {
    return await fn();
  } catch (e) {
    const st = e && e.status;
    if (st === 401 || st === 403) {
      pb.authStore.clear();
      authPromise = null;
      await ensureAuth();
      return await fn();
    }
    throw e;
  }
}

module.exports = { pb, ensureAuth, withAuth, PB_URL };
