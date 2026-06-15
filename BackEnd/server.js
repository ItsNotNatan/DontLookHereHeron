// server.js - Versão Atualizada com Veículos, Drive, Sincronizador Google Sheets e SOCKET.IO
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io'); // 🟢 1. Importando o Socket.io

// 1. Importando as rotas
const projetoRoutes = require('./src/routes/projetoRoutes');
const transporteRoutes = require('./src/routes/transporteRoutes');
const authRoutes = require('./src/routes/authRoutes');
const veiculoRoutes = require('./src/routes/veiculoRoutes');
const driveRoutes = require('./src/routes/driveRoutes'); 
const usuarioRoutes = require('./src/routes/usuarioRoutes');
const motivoRoutes = require('./src/routes/motivoRoutes');
const localRoutes = require('./src/routes/localRoutes');
const transportadoraRoutes = require('./src/routes/transportadoraRoutes');

// 2. INICIALIZANDO O APP E O SERVIDOR HTTP
const app = express(); 
const server = http.createServer(app);

// 🟢 3. INICIALIZANDO O SOCKET.IO
const io = new Server(server, {
  cors: {
    origin: "*", // Libera o acesso para qualquer front-end (em produção, coloque a URL do seu site)
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// 🟢 4. DEIXANDO O 'IO' DISPONÍVEL GLOBALMENTE PARA OS CONTROLLERS
app.set('io', io);

// 🟢 5. OUVINDO QUEM CONECTA NO TÚNEL
io.on('connection', (socket) => {
  console.log(`🟢 Novo cliente conectado (Tempo Real): ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔴 Cliente desconectado: ${socket.id}`);
  });
});

// 3. MIDDLEWARES GLOBAIS
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// DEFINIÇÃO DAS ROTAS 
app.use('/api/admin/projetos', projetoRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', transporteRoutes); 
app.use('/api/admin/veiculos', veiculoRoutes);
app.use('/api/admin/drive', driveRoutes);
app.use('/api/admin/usuarios', usuarioRoutes);
app.use('/api/admin/motivos', motivoRoutes);
app.use('/api/admin/locais', localRoutes);
app.use('/api/admin/transportadoras', transportadoraRoutes);

// 🟢 4. SINCRONIZADOR GOOGLE SHEETS 🟢
const puxarDadosDaPlanilha = require('./src/services/syncPlanilha');
// Roda pela primeira vez quando o servidor liga
puxarDadosDaPlanilha();
// Fica a rodar sozinho a cada 2 minutos (120.000 milissegundos)
setInterval(puxarDadosDaPlanilha, 120000);

// 5. INICIALIZAÇÃO DO SERVIDOR
const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.SUPABASE_URL;

// 🟢 6. ATENÇÃO: Mudou de app.listen para server.listen!
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor HTTP e WebSockets rodando na porta ${PORT}`);
});