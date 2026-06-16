/* =====================================================================
   ATMLog - AUTO-DEPLOY (vigia)
   - Faz o setup inicial (PocketBase, .env, npm install, build, seed)
   - Sobe PocketBase + Backend (que serve os 2 frontends)
   - Vigia o GitHub a cada POLL_MS; commit novo -> git pull -> rebuild do
     que mudou -> reinicia o necessario -> mostra tudo no terminal.
   Uso:  node deploy/auto-deploy.js     (rodado pelo INICIAR-ATMLOG.bat)
   ===================================================================== */
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const BACKEND = path.join(ROOT, 'BackEnd');
const CLIENT = path.join(ROOT, 'TransportViewerClient');
const ADMIN = path.join(ROOT, 'TransportViewAdm');
const PBDIR = path.join(ROOT, 'pocketbase');
const PBEXE = path.join(PBDIR, 'pocketbase.exe');
const PB_VERSION = '0.36.7';
const POLL_MS = 30000;

// ----------------- logging -----------------
const ts = () => new Date().toLocaleTimeString('pt-BR');
const log = (m) => console.log(`\x1b[36m[${ts()}]\x1b[0m ${m}`);
const ok = (m) => console.log(`\x1b[32m[${ts()}] [OK]\x1b[0m ${m}`);
const warn = (m) => console.log(`\x1b[33m[${ts()}] [!]\x1b[0m ${m}`);
const err = (m) => console.log(`\x1b[31m[${ts()}] [ERRO]\x1b[0m ${m}`);
const hr = () => console.log('\x1b[90m' + '='.repeat(66) + '\x1b[0m');

// ----------------- exec helpers -----------------
function shShell(cmd, args, cwd) { // npm / git (precisam de shell no Windows)
  return spawnSync(cmd, args, { cwd: cwd || ROOT, stdio: 'inherit', shell: true }).status === 0;
}
function gitOut(args) {
  return (spawnSync('git', args, { cwd: ROOT, shell: true, encoding: 'utf8' }).stdout || '').trim();
}

// Mata processos antigos (PocketBase/Node) que possam estar ocupando as portas.
function killPort(port) {
  const out = (spawnSync('cmd', ['/c', `netstat -aon | findstr :${port} | findstr LISTENING`], { encoding: 'utf8' }).stdout || '');
  const pids = new Set();
  out.split(/\r?\n/).forEach((l) => { const p = l.trim().split(/\s+/).pop(); if (/^\d+$/.test(p)) pids.add(p); });
  pids.forEach((p) => { try { spawnSync('taskkill', ['/f', '/pid', p], { shell: true, stdio: 'ignore' }); } catch (e) {} });
}
function killExisting() {
  try { spawnSync('taskkill', ['/f', '/im', 'pocketbase.exe'], { shell: true, stdio: 'ignore' }); } catch (e) {}
  [3001, 8080, 8082, 8090].forEach(killPort);
}
// Alinha o clone ao remoto (resiste a force-push / historico divergente).
function syncRepo() {
  shShell('git', ['fetch', 'origin'], ROOT);
  shShell('git', ['reset', '--hard', 'origin/main'], ROOT);
}

// ----------------- processos longos (PB e server) -----------------
const procs = {};
function stopProc(name) {
  const p = procs[name];
  if (p && p.pid) { try { spawnSync('taskkill', ['/pid', String(p.pid), '/f', '/t'], { shell: true, stdio: 'ignore' }); } catch (e) {} }
  delete procs[name];
}
function startProc(name, exe, args, cwd, color) {
  stopProc(name);
  const p = spawn(exe, args, { cwd: cwd || ROOT });
  const tag = `\x1b[${color || 35}m[${name}]\x1b[0m`;
  p.stdout.on('data', (d) => String(d).split(/\r?\n/).forEach(l => l && console.log(`${tag} ${l}`)));
  p.stderr.on('data', (d) => String(d).split(/\r?\n/).forEach(l => l && console.log(`${tag} ${l}`)));
  p.on('exit', (code) => warn(`${name} encerrou (code ${code})`));
  procs[name] = p;
}

// ----------------- .env minimo -----------------
function readEnv() {
  const f = path.join(BACKEND, '.env');
  const out = {};
  if (fs.existsSync(f)) {
    for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      const i = line.indexOf('=');
      if (i > 0 && !line.trim().startsWith('#')) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return out;
}

// ----------------- setup inicial -----------------
function ensurePocketBase() {
  if (fs.existsSync(PBEXE)) { ok('PocketBase encontrado'); return true; }
  log(`Baixando PocketBase v${PB_VERSION}...`);
  if (!fs.existsSync(PBDIR)) fs.mkdirSync(PBDIR, { recursive: true });
  const url = `https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_windows_amd64.zip`;
  const zip = path.join(require('os').tmpdir(), 'pbatm.zip');
  const ps = `[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '${url}' -OutFile '${zip}'; Expand-Archive -Path '${zip}' -DestinationPath '${PBDIR}' -Force`;
  spawnSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'inherit' });
  if (fs.existsSync(PBEXE)) { ok('PocketBase baixado'); return true; }
  err('Falha ao baixar o PocketBase (verifique a internet).'); return false;
}

function ensureEnv() {
  const env = path.join(BACKEND, '.env');
  if (!fs.existsSync(env)) {
    fs.copyFileSync(path.join(BACKEND, '.env.example'), env);
    warn('.env criado a partir do .env.example (troque as senhas/segredos depois).');
  } else ok('.env encontrado');
}

function npmInstallIfNeeded(dir, nome) {
  if (!fs.existsSync(path.join(dir, 'node_modules'))) {
    log(`Instalando dependencias do ${nome} (npm install)...`);
    if (!shShell('npm', ['install', '--no-audit', '--no-fund'], dir)) { err(`npm install do ${nome} falhou`); return false; }
  }
  ok(`dependencias do ${nome} prontas`);
  return true;
}

function buildFront(dir, nome) {
  log(`Buildando ${nome} (npm run build)...`);
  if (!shShell('npm', ['run', 'build'], dir)) { err(`build do ${nome} falhou`); return false; }
  ok(`${nome} buildado`);
  return true;
}

function ensureSuperuser() {
  const env = readEnv();
  const email = env.PB_ADMIN_EMAIL || 'admin@atmlog.local';
  const pass = env.PB_ADMIN_PASSWORD || 'ChangeMe_ATMLog_2026';
  let r = spawnSync(PBEXE, ['superuser', 'upsert', email, pass], { cwd: PBDIR, encoding: 'utf8' });
  if (r.status !== 0) spawnSync(PBEXE, ['superuser', 'create', email, pass], { cwd: PBDIR, encoding: 'utf8' });
  ok(`superuser do banco: ${email}`);
}

function waitForPB(cb, tries = 0) {
  http.get('http://127.0.0.1:8090/api/health', () => cb(true)).on('error', () => {
    if (tries > 20) return cb(false);
    setTimeout(() => waitForPB(cb, tries + 1), 1000);
  });
}

function runSeed(cb) {
  log('Populando o banco (seed idempotente)...');
  const p = spawn(process.execPath, [path.join(BACKEND, 'seed.js')], { cwd: BACKEND });
  p.stdout.on('data', d => process.stdout.write(`  \x1b[34m[seed]\x1b[0m ${d}`));
  p.stderr.on('data', d => process.stdout.write(`  \x1b[34m[seed]\x1b[0m ${d}`));
  p.on('exit', () => cb());
}

function startBackend() {
  startProc('server', process.execPath, [path.join(BACKEND, 'server.js')], BACKEND, 32);
}
function startPocketBase() {
  startProc('pocketbase', PBEXE, ['serve', '--http=0.0.0.0:8090'], PBDIR, 33);
}

function localIP() {
  const nets = require('os').networkInterfaces();
  for (const name of Object.keys(nets)) for (const n of nets[name]) if (n.family === 'IPv4' && !n.internal) return n.address;
  return 'localhost';
}
function bannerPronto() {
  const ip = localIP();
  hr();
  console.log('\x1b[1m\x1b[32m   ATMLog NO AR\x1b[0m');
  console.log(`   Front Publico : http://${ip}:8080`);
  console.log(`   Painel Admin  : http://${ip}:8082   (admin@comau.com / admin123)`);
  console.log(`   PocketBase    : http://${ip}:8090/_/`);
  hr();
  log(`Vigiando o GitHub a cada ${POLL_MS / 1000}s por novos commits...`);
}

// ----------------- ciclo de atualizacao -----------------
let atualizando = false;
function verificarAtualizacao() {
  if (atualizando) return;
  const local = gitOut(['rev-parse', 'HEAD']);
  const remoto = (gitOut(['ls-remote', 'origin', 'HEAD']).split(/\s+/)[0]) || '';
  if (!remoto || remoto === local) return;

  atualizando = true;
  hr();
  log(`\x1b[1mNovo commit detectado!\x1b[0m  ${local.slice(0, 7)} -> ${remoto.slice(0, 7)}`);
  log('Baixando alteracoes (git fetch + reset --hard)...');
  shShell('git', ['fetch', 'origin'], ROOT);
  if (!shShell('git', ['reset', '--hard', 'origin/main'], ROOT)) { err('git reset falhou'); atualizando = false; return; }

  const mudou = gitOut(['diff', '--name-only', local, 'HEAD']).split(/\r?\n/).filter(Boolean);
  const tocou = (pref) => mudou.some(f => f.startsWith(pref));
  log('Arquivos alterados:'); mudou.slice(0, 20).forEach(f => console.log('   ~ ' + f));

  // Backend
  if (tocou('BackEnd/')) {
    if (tocou('BackEnd/package')) shShell('npm', ['install', '--no-audit', '--no-fund'], BACKEND);
  }
  // Frontends (rebuild; o server serve o dist direto do disco, nao precisa reiniciar)
  if (tocou('TransportViewerClient/')) {
    if (tocou('TransportViewerClient/package')) npmInstallIfNeeded(CLIENT, 'Client') || shShell('npm', ['install', '--no-audit', '--no-fund'], CLIENT);
    buildFront(CLIENT, 'Client');
  }
  if (tocou('TransportViewAdm/')) {
    if (tocou('TransportViewAdm/package')) shShell('npm', ['install', '--no-audit', '--no-fund'], ADMIN);
    buildFront(ADMIN, 'Admin');
  }

  const finalizar = () => {
    if (tocou('BackEnd/')) { log('Reiniciando o backend...'); startBackend(); }
    ok('Atualizacao aplicada.');
    hr();
    atualizando = false;
  };

  // PocketBase / migrations
  if (tocou('pocketbase/pb_migrations')) {
    log('Migrations mudaram - reiniciando o PocketBase e re-seedando...');
    startPocketBase();
    waitForPB((up) => {
      if (!up) warn('PocketBase demorou a responder.');
      ensureSuperuser();
      runSeed(finalizar);
    });
  } else {
    finalizar();
  }
}

// ----------------- main -----------------
function main() {
  hr();
  console.log('\x1b[1m  ATMLog - AUTO-DEPLOY\x1b[0m   (Ctrl+C para encerrar)');
  hr();

  log('Encerrando instancias antigas e liberando as portas...');
  killExisting();
  log('Sincronizando o codigo com o GitHub...');
  syncRepo();

  if (!ensurePocketBase()) process.exit(1);
  ensureEnv();
  if (!npmInstallIfNeeded(BACKEND, 'Backend')) process.exit(1);
  npmInstallIfNeeded(CLIENT, 'Client');
  npmInstallIfNeeded(ADMIN, 'Admin');
  ensureSuperuser();

  // build inicial se faltar dist
  if (!fs.existsSync(path.join(CLIENT, 'dist', 'index.html'))) buildFront(CLIENT, 'Client');
  if (!fs.existsSync(path.join(ADMIN, 'dist', 'index.html'))) buildFront(ADMIN, 'Admin');

  log('Iniciando PocketBase (porta 8090)...');
  startPocketBase();
  waitForPB((up) => {
    if (up) ok('PocketBase rodando'); else warn('PocketBase nao respondeu a tempo (seguindo mesmo assim).');
    runSeed(() => {
      log('Iniciando o Backend (API 3001 + fronts 8080/8082)...');
      startBackend();
      setTimeout(bannerPronto, 2500);
      setInterval(verificarAtualizacao, POLL_MS);
    });
  });
}

process.on('SIGINT', () => { log('Encerrando...'); stopProc('server'); stopProc('pocketbase'); process.exit(0); });
main();
