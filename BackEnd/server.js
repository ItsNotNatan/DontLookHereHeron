// server.js - Servidor de producao ATMLog (Express + PocketBase + Socket.io)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] erro nao tratado (servico continua):', err);
});
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection] promise sem catch (servico continua):', err);
});

const ROOT = path.join(__dirname, '..'); 
const PORT_API = process.env.PORT_API || 3001;
const PORT_CLIENT = process.env.PORT_CLIENT || 8080;
const PORT_ADMIN = process.env.PORT_ADMIN || 8082;

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] } });
app.set('io', io);
io.on('connection', (socket) => {
  console.log(`🟢 Cliente tempo-real conectado: ${socket.id}`);
  socket.on('disconnect', () => console.log(`🔴 Cliente desconectado: ${socket.id}`));
});

app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      const p = req.path || req.originalUrl || '';
      if (p.includes('/projetos')) io.emit('projetos_atualizados');
      else if (p.includes('/motivos')) io.emit('motivos_atualizados');
      else if (p.includes('/transportadoras')) io.emit('transportadoras_atualizadas');
      else if (p.includes('/usuarios')) io.emit('usuarios_atualizados');
      else if (p.includes('/veiculos')) io.emit('veiculos_atualizados');
      else if (p.includes('/locais')) io.emit('locais_atualizados');
      else if (p.includes('/transportes')) io.emit('transportes_atualizados');
    });
  }
  next();
});

// 🟢 ADICIONADO: Libera acesso HTTP público para os anexos locais salvos na pasta uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rotas
app.use('/api/admin/projetos', require('./src/routes/projetoRoutes'));
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api', require('./src/routes/transporteRoutes'));
app.use('/api/admin/veiculos', require('./src/routes/veiculoRoutes'));
app.use('/api/admin/drive', require('./src/routes/driveRoutes'));
app.use('/api/admin/usuarios', require('./src/routes/usuarioRoutes'));
app.use('/api/admin/motivos', require('./src/routes/motivoRoutes'));
app.use('/api/admin/locais', require('./src/routes/localRoutes'));
app.use('/api/admin/transportadoras', require('./src/routes/transportadoraRoutes'));

app.get('/api/health', (req, res) => res.json({ ok: true, servico: 'ATMLog API', hora: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error('[API] erro nao tratado na requisicao:', err);
  if (!res.headersSent) res.status(500).json({ erro: 'Erro interno no servidor.' });
});

httpServer.listen(PORT_API, '0.0.0.0', () => console.log(`🚀 API + WebSocket rodando na porta ${PORT_API}`));

function servirSPA(nome, distDir, porta) {
  const spa = express();
  spa.use(cors());
  const indexPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    spa.use((req, res) => res.status(503).send(
      `<h2>${nome}: build nao encontrado</h2><p>O auto-deploy ainda nao gerou o build. Esperado em:</p><pre>${distDir}</pre>`
    ));
    spa.listen(porta, '0.0.0.0', () => console.log(`⚠️  ${nome} na porta ${porta} (SEM build ainda)`));
    return;
  }
  spa.use(express.static(distDir));
  spa.use((req, res) => res.sendFile(indexPath, (err) => {
    if (err && !res.headersSent) res.status(503).send(`${nome}: build sendo updated, tente novamente em instantes.`);
  }));
  spa.listen(porta, '0.0.0.0', () => console.log(`🌐 ${nome} rodando na porta ${porta}`));
}

servirSPA('Client (publico)', path.join(ROOT, 'TransportViewerClient', 'dist'), PORT_CLIENT);
servirSPA('Admin (gestao)', path.join(ROOT, 'TransportViewAdm', 'dist'), PORT_ADMIN);

if (process.env.GOOGLE_CLIENT_EMAIL) {
  const puxarDadosDaPlanilha = require('./src/services/syncPlanilha');
  puxarDadosDaPlanilha();
  setInterval(puxarDadosDaPlanilha, 120000);
  console.log('🔁 Sincronizacao do Google Sheets ATIVA (a cada 2 min).');
} else {
  console.log('⏸️  Sincronizacao do Google Sheets DESATIVADA.');
}
