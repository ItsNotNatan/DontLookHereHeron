# 🔄 ATMLog — Auto-Deploy (self-hosted, atualiza sozinho pelo GitHub)

Este projeto roda **100% self-hosted** (sem Supabase/Render/Vercel): o banco é o **PocketBase**
e o servidor é o **Node/Express**. A máquina remota **clona o repositório** e fica **vigiando o
GitHub**: quando alguém faz `push`, ela detecta, baixa, rebuilda só o que mudou e reinicia — tudo
aparecendo num terminal.

## Como funciona (visão geral)
```
Voce (dev) edita o codigo  ->  git push  ->  GitHub
                                                  |
                       (a maquina remota verifica a cada 30s)
                                                  v
   git pull  ->  rebuild do que mudou  ->  reinicia PocketBase/Backend  ->  no ar
```

## Estrutura do projeto
```
BackEnd/                 # API (Express + PocketBase + Socket.io)
  src/                   # controllers, rotas, config, etc.
  seed/                  # dados iniciais (locais, projetos) em JSON
  seed.js                # popula o banco (idempotente)
  server.js              # API (3001) + serve os 2 fronts (8080/8082)
  .env.example           # modelo de configuracao
TransportViewerClient/   # front publico (Vite/React)
TransportViewAdm/        # painel admin (Vite/React)
pocketbase/
  pb_migrations/         # SCHEMA do banco (cria as colecoes) - NAO apague
  pocketbase.exe         # baixado automaticamente
  pb_data/               # O BANCO em si (gerado) - faca BACKUP daqui
deploy/
  auto-deploy.js         # o "vigia" (faz tudo)
  INICIAR-ATMLOG.bat     # inicializador (1a vez)
```

## Primeira instalação (na máquina remota)
**Pré-requisitos:** Windows 10/11, internet, e ser Administrador. (O `INICIAR-ATMLOG.bat`
tenta instalar **Node** e **Git** sozinho via winget se faltarem.)

1. Baixe e extraia o **Deploy.zip** numa pasta (ex.: `C:\ATMLog`).
2. Botão direito no **`INICIAR-ATMLOG.bat`** → **Executar como administrador**.
3. Ele instala Node/Git (se faltar), cria o firewall, **clona o repositório** e liga o auto-deploy.
   - A 1ª vez baixa o PocketBase, roda `npm install` e builda os fronts (alguns minutos).
   - **Na 1ª vez ele PERGUNTA o e-mail e a senha do admin do banco (PocketBase)** — digite e ele salva
     no `BackEnd\.env` (fica só na máquina, não vai pro GitHub). Os segredos JWT são gerados sozinhos.
4. Quando aparecer **"ATMLog NO AR"**, acesse:
   - Público: `http://<IP>:8080`
   - Admin: `http://<IP>:8082` (admin@comau.com / admin123)
   - PocketBase: `http://<IP>:8091/_/` (o e-mail/senha que você digitou no passo 3)

A partir daí, **deixe esse terminal aberto** — é ele que vigia e atualiza.

### Teclas de controle (no terminal do auto-deploy)
- **R** = reiniciar os servidores (PocketBase + Backend)
- **U** = verificar/atualizar agora (sem esperar os 30s)
- **Q** = parar tudo e sair  (use isto em vez do Ctrl+C, que nem sempre encerra os processos)
- **H** = mostrar as teclas

## Manutenção (o dia a dia)
**Você (Heron/Natan) NÃO mexe mais na máquina remota.** Só:
1. Edita o código no seu PC (frontend em `TransportViewerClient`/`TransportViewAdm`, backend em `BackEnd`).
2. `git add` / `git commit` / `git push`.
3. Em ~30s a máquina remota detecta, baixa e aplica **sozinha**, mostrando no terminal.

O auto-deploy é inteligente:
- Mudou só o front? → rebuilda só aquele front (não reinicia o resto).
- Mudou o backend? → reinicia o servidor.
- Mudou `pocketbase/pb_migrations`? → reinicia o PocketBase e re-roda o seed (idempotente).

## Backup do banco
Todo o banco fica em **`pocketbase/pb_data/`**. Pare o auto-deploy (Ctrl+C) e copie essa pasta.

## Parar / reiniciar
- **Parar:** no terminal do auto-deploy, aperte **Q** (encerra Backend + PocketBase de verdade).
- **Reiniciar:** aperte **R** no terminal (ou rode o `INICIAR-ATMLOG.bat` de novo).

## Dúvidas comuns
- **"node/git nao encontrado":** instale Node (nodejs.org) e Git (git-scm.com), reinicie a máquina.
- **Outro PC nao acessa:** rode como Administrador (firewall) e confirme que estão na mesma rede.
- **Quero trocar a senha do PocketBase:** edite `BackEnd/.env` (`PB_ADMIN_PASSWORD`) e reinicie.
