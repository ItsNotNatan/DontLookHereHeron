# 🗄️ Como o banco saiu do Supabase (SQL) para o PocketBase

Antes o ATMLog usava **Supabase (PostgreSQL)**. Agora usa **PocketBase** (um banco em arquivo,
self-hosted). Este documento explica como foi feita a conversão, para você conseguir manter.

## De onde veio
Os scripts SQL originais do Supabase estão em **`BD/BD/`** (na raiz do repo):
- `ATMLog.txt` — schema (CREATE TABLE) + dados de exemplo (usuários, transportadoras, veículos…).
- `Enderecos1-4.txt` — ~3 mil endereços/fornecedores (INSERT em `locais_base`).
- `Projetos.txt` — lista de projetos/WBS.

## Para onde foi (no PocketBase)
A conversão tem **3 peças**:

### 1) Schema → `pocketbase/pb_migrations/`
Cada `CREATE TABLE` do Postgres virou uma **coleção** do PocketBase, definida no arquivo de
migration `1700000001_init_atmlog_schema.js`. O PocketBase aplica isso **sozinho** quando inicia.

Tabelas (Postgres) → Coleções (PocketBase):
| Postgres | PocketBase | Observação |
|---|---|---|
| `usuarios`, `refresh_tokens` | iguais | login do painel (JWT próprio) |
| `transportadoras`, `projetos`, `veiculos`, `motivos` | iguais | cadastros de apoio |
| `locais_base`, `enderecos_pedido` | iguais | endereços |
| `pedidos_atm` | igual | usa **relações** para origem/destino/transportadora |
| `faturamento_atm` | igual | relação 1-1 com `pedidos_atm` (via `id_atm`) |
| `atms_externos_temp` | igual | staging do Google Forms |

> As Foreign Keys do Postgres viraram campos do tipo **relation** no PocketBase. Os JOINs (`select *, origem(...)`)
> viraram `expand` no SDK do PocketBase (ver `BackEnd/src/controllers/transporteController.js`).

### 2) Dados em massa (endereços e projetos) → `BackEnd/seed/*.json`
Os milhares de `INSERT` dos `Enderecos*.txt`/`Projetos.txt` foram convertidos em JSON por um
script: **`tools/convert-seed.js`**. Ele lê os `.txt`, respeita aspas/vírgulas e a ordem das
colunas (que varia entre os arquivos), remove duplicados e gera:
- `BackEnd/seed/locais_base.json` (~3.162 locais)
- `BackEnd/seed/projetos.json`

**Se os endereços/projetos mudarem no futuro**, basta atualizar os `.txt` em `BD/BD/` e rodar:
```bash
node tools/convert-seed.js
```
que ele regenera os JSON.

### 3) Carga inicial → `BackEnd/seed.js`
O `seed.js` popula o banco (usando o JSON acima + os cadastros fixos: usuários, transportadoras,
veículos, motivos). É **idempotente**: só insere numa coleção se ela estiver vazia, então pode
rodar quantas vezes quiser que não duplica. O auto-deploy roda ele automaticamente.

## Resumo prático para manutenção
- **Mudar a ESTRUTURA do banco** (nova coleção/campo): mais fácil pelo painel do PocketBase
  (`http://<IP>:8090/_/`) — ele grava a migration sozinho. Ou crie um novo arquivo em
  `pocketbase/pb_migrations/`.
- **Mudar os DADOS iniciais:** edite `BackEnd/seed.js` (cadastros) ou os `.txt` + `convert-seed.js` (massa).
- **Login do painel:** `admin@comau.com` / `admin123` (criado pelo seed). Troque depois.
- **Admin do banco (PocketBase):** `admin@atmlog.local` + senha do `BackEnd/.env` (`PB_ADMIN_PASSWORD`).
