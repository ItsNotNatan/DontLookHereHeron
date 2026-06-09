# memory.md — Contexto do Projeto ATMLog (Gestão de Fretes)

> Arquivo de contexto para assistentes de IA (Claude Code, Copilot, Cursor, etc.).
> Objetivo: dar ao modelo uma visão completa do projeto antes de analisar/editar código.

---

## 1. O que é

**ATMLog** é um sistema de **gestão de transportes / fretes** (ATM = *Autorização de Transporte de Mercadoria*), aparentemente usado pela Comau. Permite:

- abrir solicitações de transporte (com cargas, rota, NF, projeto/WBS);
- rastrear pedidos e acompanhar status;
- simular a ocupação de veículos em **3D** (cubagem);
- gerenciar a operação (transportadoras, faturamento/SAP, comprovantes);
- visualizar **BI financeiro** (custo por mês, rota, transportadora, divergências).

## 2. Arquitetura — 3 aplicações independentes

| Pasta | Papel | Stack |
|---|---|---|
| `BackEnd/` | API REST central | Node + Express 5 + Supabase (PostgreSQL) |
| `TransportViewerClient/` | App **público** (solicitantes) | React 19 + Vite + Three.js |
| `TransportViewerAdm/` | **Painel administrativo** (restrito, com login) | React 19 + Vite |

As duas frontends consomem o mesmo backend.
- Em **dev**: backend em `http://localhost:3001/api`.
- Em **produção**: backend no Render (`https://backendtransportview.onrender.com/api`); fronts hospedados (ex.: Vercel).

## 3. Como rodar (desenvolvimento)

```bash
# Backend
cd BackEnd
npm install
npm run dev        # nodemon server.js  (porta 3001)

# Cliente público
cd TransportViewerClient
npm install
npm run dev        # Vite

# Painel admin
cd TransportViewerAdm
npm install
npm run dev        # Vite
```

## 4. Variáveis de ambiente

**Backend (`BackEnd/.env`):**
- `SUPABASE_URL`, `SUPABASE_KEY` — conexão Supabase
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — assinatura dos tokens
- `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` — service account (Google Sheets + Drive)
- `PORT` (opcional, default 3001)

**Admin (`TransportViewerAdm/.env`):**
- `VITE_API_URL` — URL base da API (senão usa `http://localhost:3001/api`)

> O Client decide a URL sozinho via `window.location.hostname` (localhost vs produção).

## 5. Backend — estrutura e rotas

Padrão por domínio: `src/routes/*Routes.js → src/controllers/*Controller.js → src/config/supabase.js`.
Middlewares: `verificarToken` (JWT) e `permitirPerfis([...])` (RBAC) em `src/middlewares/authMiddleware.js`.

| Prefixo | Conteúdo | Proteção |
|---|---|---|
| `/api/auth` | login / refresh / logout | público |
| `/api/transportes` (POST) | cria pedido | público |
| `/api/transportes/rastreio/:codigo` | rastreio público | público |
| `/api/admin/transportes` (GET) | lista todos os pedidos | **público hoje** (ver bugs) |
| `/api/admin/transportes/:id` (PUT) | edita pedido | Admin/Operador |
| `/api/admin/transportes/lote/editar` (PUT) | edição em lote | Admin/Operador |
| `/api/admin/projetos` | CRUD WBS/projetos | GET público; escrita Admin/Operador |
| `/api/admin/veiculos` | CRUD frota | GET público; escrita Admin |
| `/api/admin/usuarios` | CRUD usuários | Admin |
| `/api/admin/motivos` | CRUD motivos/divergências | Admin/Operador (GET tb Visualizador) |
| `/api/admin/locais` | CRUD endereços base | **público hoje** (ver bugs) |
| `/api/admin/transportadoras` | CRUD transportadoras (soft-delete) | Admin/Operador |
| `/api/admin/drive/upload` | upload de comprovante p/ Google Drive | público |

**Sincronizador Google Sheets** (`src/services/syncPlanilha.js`): a cada **2 min** o servidor lê uma planilha (respostas de formulário), importa pedidos novos para a tabela `atms_externos_temp` e marca a linha como `Sincronizado = SIM`. Roda também no boot do servidor.

## 6. Modelo de dados (tabelas Supabase)

- **`pedidos_atm`** — entidade central. Campos relevantes: `numero_atm`, `status`, `tipo_operacao`, `solicitacao` (solicitante), `pedido_compra`, `nf`, `valor_nf`, `valor_realizado`, `cotacao_bid`, `wbs`, `veiculo`, `tipo_frete`, `peso`, `volume`, `medidas`, `lista_cargas` (JSON), `comprovantes` (JSON), `link_rastreio`, `motivo`, `observacoes`, `data_solicitacao`, `data_coleta`, `data_entrega`, FKs `id_origem`/`id_destino`/`id_transportadora`.
- **`enderecos_pedido`** — origem/destino de cada pedido (histórico, 1 linha por endereço).
- **`faturamento_atm`** — financeiro/SAP, 1 por pedido (FK `id_atm`): `tipo_documento`, `data_mapeamento`, `fatura_cte`, `valor_previsto`, `data_emissao`, `vencimento`, `elemento_pep_cc_wbs`, `validacao_pep`, `registrado_sap`.
- **`locais_base`** — endereços pré-cadastrados reutilizáveis (`ativo`).
- **`projetos`** — projetos por `wbs`.
- **`transportadoras`** — `nome`, `ativo` (exclusão lógica).
- **`motivos`** — `nome`, `descricao`, `cor` (divergências).
- **`veiculos`** — `nome`, `comprimento`, `largura`, `altura`, `ativo`.
- **`usuarios`** — `nome`, `email`, `senha`, `perfil`, `ativo`.
- **`refresh_tokens`** — tokens de refresh (`usuario_id`, `token`, `expira_em`).
- **`atms_externos_temp`** — staging dos pedidos vindos do Google Forms.

## 7. Frontend Client (público) — `TransportViewerClient`

Rotas (`src/routes.jsx`), **sem login**:
- `/` — Home (hub de 4 cards).
- `/solicitar` — `RequestForm`: formulário de novo pedido (busca CEP no ViaCEP, endereços cadastrados, lista de cargas com cor/dimensões/peso).
- `/simulador-veiculo` — `MedidorCargas`: simulador 3D (Three.js) — `engine3D.js` desenha o veículo, empilha cargas, calcula ocupação e permite arrastar caixas com colisão. Cargas compartilhadas com o formulário via `CargasContext`.
- `/painelatm` — `PainelAtm`: tabela de rastreamento, busca/filtros, LED de desvio de custo, export Excel.
- `/financeiro` — `AcompFinan`: BI financeiro (Recharts).

> Existem `pages/Login/Login.jsx` e `components/context/context.jsx` (auth) que **não estão no router** = código morto.

## 8. Frontend Adm (restrito) — `TransportViewerAdm`

- Login obrigatório; rotas protegidas por perfil em `src/routes.jsx` (`RotaPrivada` + `RotaProtegida`).
- `src/services/api.js` injeta o `accessToken` em toda requisição e **renova automaticamente** no erro 403 (refresh token).
- Menu lateral muda conforme o perfil (`componentes/layout/layout.jsx`).
- Telas:
  - **Tabela Principal** (`Dashboard.jsx`) — planilha com blocos "Operação" e "Faturamento/SAP", filtros avançados, paginação, seleção múltipla e **edição em lote**.
  - **CardExpandido** — ficha do pedido: link de rastreio, registro de divergência, **upload de comprovantes** (drag&drop → Google Drive; ao anexar muda status p/ "Entregue") e geração de **PDF** (`BtnPdf.jsx`, pdfmake).
  - **CardEditavel** — edição completa do pedido.
  - **Editores** — Projetos, Endereços, Transportadoras, Motivos (Admin/Operador); Usuários e Veículos (só Admin). `EditorVeiculos` tem preview 3D do baú.

## 9. RBAC — perfis de acesso

- **Admin** — acesso total (inclui usuários e veículos).
- **Operador** — operação + cadastros de apoio (sem usuários/veículos).
- **Visualizador** — leitura.

Perfil é guardado em `localStorage.perfil` no front e dentro do JWT no back.

## 10. Ciclo de vida de um ATM

1. Solicitante abre pedido no Client (`/solicitar`) **ou** via Google Forms (importado pelo sync).
2. Status inicial: `Aguardando Aprovação`.
3. Operação edita no Adm: define transportadora, valores, faturamento, link de rastreio.
4. Anexa comprovante → status vira `Entregue`.
5. Dados alimentam o BI financeiro.

Status possíveis: `Aguardando Aprovação`, `Pendente`, `Aguardando Coleta`, `Em Trânsito`, `Entregue`, `Frete morto`, `Recusado`.

## 11. Convenções de código

- Código e comentários em **português**.
- React 19 + Vite; CSS por componente (arquivos `.css` ao lado do `.jsx`).
- `react-select` para selects com busca; `recharts` para gráficos; `three` para 3D; `exceljs`/`xlsx` para Excel; `pdfmake`/`jspdf` para PDF.
- Datas: front usa `DD/MM/AAAA`; backend converte para `AAAA-MM-DD` em `utils/formatters.js`.
- Valores monetários com máscara BRL no front; backend salva número.

## 12. Bugs / pontos de atenção conhecidos

> Detalhes e localização estão nas Issues do repositório. Resumo:

- **Segurança:** chave de service account do Google commitada (`BackEnd/atmlog-integracao-*.json`); credenciais de SQL Server hardcoded em `TransportViewerClient/src/sql.js`.
- **Senhas em texto puro** no banco/login (`authController.js`).
- **Rotas que deveriam ser autenticadas estão públicas** (`GET /admin/transportes`, todo o `/admin/locais`).
- **ID da pasta do Drive malformado** (`...?hl`) em `driveController.js`.
- **URL `localhost` hardcoded** no `handleSalvarLote` do `Dashboard.jsx` (Adm) — quebra em produção.
- **Inconsistência de campos financeiros** (`valor` x `valor_nf` x `valor_previsto` x `cotacao_bid`) entre telas/Excel.
- **Labels de "Tipo de Operação" trocados** em `RequestForm.jsx` (value `Importação` exibe `NACIONAL`).
- `sql.js` é script morto (usa `mssql` no browser, template literals com aspas simples, roda no import).
- `componentes/DashboardFrame/DashboardFrame.jsx` está vazio.

## 13. Glossário

- **ATM** — Autorização de Transporte de Mercadoria (o pedido).
- **WBS** — código de projeto / centro de custo.
- **CT-e** — Conhecimento de Transporte eletrônico.
- **PEP** — elemento de planejamento (SAP).
- **BID / Cotação** — valor cotado do frete.
- **Frete morto** — frete contratado e não utilizado.
