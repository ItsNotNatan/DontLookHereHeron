# 🚚 ATMLog — Guia de Deploy e Manutenção

Pacote de produção para rodar o **ATMLog** numa máquina Windows, **self-hosted** (sem Supabase).
O banco agora é o **PocketBase** (um único `.exe` + uma pasta de dados local).

> **Leitura rápida:** se é a primeira vez, siga as seções **1 → 2 → 3** na ordem.
> Para atualizar o sistema depois, vá direto na seção **6 (Manutenção)**.

---

## 0. Como o sistema é organizado

| Serviço | Porta | Para que serve | URL na rede |
|---|---|---|---|
| **PocketBase** | 8090 | Banco de dados | `http://<IP>:8090/_/` (painel do banco) |
| **API** (Express/Node) | 3001 | Regras de negócio | `http://<IP>:3001/api` |
| **Front Público** (Client) | 8080 | Solicitar / rastrear / BI | `http://<IP>:8080` |
| **Painel Admin** | 8082 | Gestão (login) | `http://<IP>:8082` |

Tudo roda **na mesma máquina**. Os frontends descobrem a API sozinhos pelo endereço da
página (porta 3001) — **não há IP fixo no código**, então funciona em qualquer rede.

Estrutura da pasta:
```
ATMLog-Deploy/
├── deploy.bat              ← inicia tudo (rode como Administrador)
├── server.js              ← API + serve os 2 frontends
├── seed.js                ← popula o banco (idempotente)
├── .env.example           ← modelo de configuração (vira .env)
├── package.json
├── pocketbase/
│   ├── pocketbase.exe      ← (baixado automaticamente; ou manual — ver 1.1)
│   ├── pb_migrations/      ← cria as tabelas/coleções (NÃO apague)
│   └── pb_data/            ← O BANCO em si (gerado ao rodar — É O QUE SE FAZ BACKUP)
├── public/
│   ├── client/             ← build do front público (index.html + assets/)
│   └── admin/              ← build do painel admin (index.html + assets/)
├── seed/                   ← dados iniciais (locais, projetos) em JSON
└── src/                    ← código do backend (controllers, rotas, etc.)
```

---

## 1. Pré-requisitos

### 1.1 NA MÁQUINA REMOTA (o servidor)

**a) Node.js 18 ou superior** — *obrigatório*, não vem instalado por padrão.
1. Acesse **https://nodejs.org** e baixe o instalador **LTS** ("Windows Installer (.msi)", 64-bit).
2. Execute o `.msi` e clique **Next** até concluir (deixe marcada a opção de **adicionar ao PATH**).
3. Para conferir, abra o **Prompt de Comando** e rode:
   ```bat
   node -v
   ```
   Deve aparecer algo como `v20.x.x`. Se aparecer "não é reconhecido", **reinicie a máquina** e tente de novo.

**b) PocketBase** — o `deploy.bat` **baixa automaticamente** na primeira execução (precisa de internet).
   - *Se a máquina não tiver internet*, baixe manualmente em outro PC:
     `https://github.com/pocketbase/pocketbase/releases/download/v0.36.7/pocketbase_0.36.7_windows_amd64.zip`
     Extraia e coloque o **`pocketbase.exe`** dentro da pasta **`ATMLog-Deploy\pocketbase\`**.

**c) Internet** — necessária na 1ª vez (baixar PocketBase + `npm install`) e, se for usar, para o
   Google Sheets/Drive. Depois disso o sistema roda na rede interna normalmente.

**d) Permissão de Administrador** — o `deploy.bat` precisa para criar regras de firewall.

### 1.2 NO SEU PC (onde você gera os builds dos frontends)
- **Node.js 18+** (mesmo passo do item 1.1.a). Você só precisa disso para rodar o `npm run build`.

---

## 2. Build inicial dos frontends (no SEU PC)

Os frontends (React) precisam ser "compilados" em arquivos estáticos (a pasta `dist`).
Faça isso **no seu PC** (não na máquina remota).

> Os projetos dos frontends ficam nas pastas **`TransportViewerClient`** e **`TransportViewAdm`**
> (ao lado da pasta `ATMLog-Deploy`).

**Front Público (Client):**
```bat
cd TransportViewerClient
npm install
npm run build
```
Isso gera `TransportViewerClient\dist`. **Copie TODO o conteúdo** dessa `dist`
(o `index.html`, a pasta `assets`, etc.) para dentro de **`ATMLog-Deploy\public\client\`**.

**Painel Admin:**
```bat
cd TransportViewAdm
npm install
npm run build
```
Gera `TransportViewAdm\dist`. **Copie TODO o conteúdo** para **`ATMLog-Deploy\public\admin\`**.

> ✅ No fim, `public\client\index.html` e `public\admin\index.html` devem existir.
> 💡 Os builds **já vêm prontos** neste pacote; este passo só é necessário quando você
>    alterar o código de algum frontend (ver seção 6.1).

---

## 3. Levar para o servidor e rodar

1. **Copie a pasta `ATMLog-Deploy` inteira** para a máquina remota (ex.: `C:\ATMLog`).
2. **Configure o `.env`**: na 1ª execução, o `deploy.bat` cria o `.env` a partir do
   `.env.example` e abre o Bloco de Notas. Preencha:
   | Variável | O que colocar |
   |---|---|
   | `PB_ADMIN_PASSWORD` | Senha do admin do **banco** (mín. 8 caracteres). |
   | `JWT_SECRET` / `JWT_REFRESH_SECRET` | Dois textos longos e aleatórios (qualquer coisa difícil). |
   | `GOOGLE_CLIENT_EMAIL` / `GOOGLE_PRIVATE_KEY` | (Opcional) credenciais do Google. **Deixe vazio para desligar** o sync do Sheets. |
   | `DRIVE_FOLDER_ID` | (Opcional) ID da pasta do Google Drive para anexos. |

   Salve o arquivo e feche o Bloco de Notas.
3. Clique com o **botão direito** em **`deploy.bat`** → **Executar como administrador**.
4. Aguarde. Quando aparecer **"ATMLog INICIADO COM SUCESSO!"**, está no ar.

> Para **parar** os servidores, volte na janela do `deploy.bat` e aperte qualquer tecla.

---

## 4. O que o `deploy.bat` faz (para você saber)
Em ordem, automaticamente:
1. Confere se está como Administrador e se o Node está instalado.
2. **Baixa o PocketBase** se não existir.
3. Roda **`npm install`** se as dependências não estiverem instaladas.
4. Cria as **regras de firewall** (portas 8090, 3001, 8080, 8082).
5. Encerra execuções anteriores (evita "porta ocupada").
6. Cria/garante o **superuser** do PocketBase (admin do banco).
7. Sobe o **PocketBase** → ele aplica as **migrations** (cria as coleções).
8. Roda o **seed** (usuários, transportadoras, veículos, ~3 mil locais, projetos) — **idempotente**: não duplica se já existir.
9. Sobe a **API + os dois frontends**.
10. Detecta o **IP** e mostra os links de acesso.

---

## 5. Acessos e login inicial

- **Público:** `http://<IP>:8080`
- **Admin:** `http://<IP>:8082` — login inicial **`admin@comau.com`** / **`admin123`**
- **Banco (PocketBase):** `http://<IP>:8090/_/` — login = o `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD` do `.env`

> 🔐 **Troque as senhas padrão** dos usuários (`admin123`, etc.) pelo painel de Gestão de Usuários após o 1º acesso.

Usuários de exemplo já criados pelo seed:
| E-mail | Senha | Perfil |
|---|---|---|
| admin@comau.com | admin123 | Admin |
| operador@comau.com | operador123 | Operador |
| visualizador@comau.com | visu123 | Visualizador |

---

## 6. Manutenção (o dia a dia)

### 6.1 Atualizar um frontend (o caso mais comum)
Quando você mexer no visual/telas do Client ou do Admin:
1. **No seu PC:** entre na pasta do front alterado e rode `npm run build`.
2. Apague o conteúdo antigo de `ATMLog-Deploy\public\client\` (ou `admin\`) **na máquina remota**
   e copie o **novo `dist`** no lugar.
3. **Reinicie:** pare o `deploy.bat` (qualquer tecla) e rode de novo.
   - *Dica:* só o front mudou? Não precisa mexer no banco — o seed não duplica nada.

### 6.2 Mexer no backend (regras da API)
O código do servidor está em **`ATMLog-Deploy\src\`** (controllers, rotas, etc.).
1. Edite os arquivos `.js` diretamente.
2. Reinicie o `deploy.bat`. (Não precisa rebuildar frontend.)
3. Se você adicionar uma dependência nova, rode `npm install` na pasta `ATMLog-Deploy`.

### 6.3 Mudar configuração (`.env`)
Edite o **`.env`** (senhas, segredos, Google) e **reinicie** o `deploy.bat`.
Nunca versione/compartilhe o `.env` — ele tem segredos.

### 6.4 Mudar o banco (adicionar coleção ou campo)
O schema do banco está em **`pocketbase\pb_migrations\`** (arquivos `.js`).
- A forma **mais fácil**: abra o painel `http://<IP>:8090/_/`, crie/edite a coleção pela tela, e
  o PocketBase grava a migration sozinho.
- Ou crie um novo arquivo de migration (ex.: `1700000002_nova_coluna.js`) seguindo o padrão do
  existente. Ele é aplicado automaticamente quando o PocketBase reinicia.
- ⚠️ **Nunca apague** a pasta `pb_migrations` nem os arquivos já aplicados.

### 6.5 Repopular / corrigir dados iniciais
- O seed só insere se a coleção estiver **vazia**. Para forçar, limpe a coleção pelo painel do PB
  e rode `node seed.js` na pasta `ATMLog-Deploy`.
- Para incluir 4 ATMs de **exemplo/teste**, adicione `SEED_SAMPLE=true` no `.env` antes de rodar o seed.

---

## 7. Banco de dados — backup e restauração
- **Todo o banco** fica na pasta **`pocketbase\pb_data\`**.
- **Backup:** pare os serviços e **copie a pasta `pb_data`** inteira para um local seguro.
- **Restaurar:** pare os serviços e substitua a `pb_data` pela cópia do backup.
- O painel `http://<IP>:8090/_/` também tem **Settings → Backups** para gerar/baixar backups.

---

## 8. Parar / reiniciar
- **Parar:** na janela do `deploy.bat`, aperte qualquer tecla (ele encerra PocketBase + Node).
- **Reiniciar:** rode o `deploy.bat` de novo.
- **Forçar parada** (se algo travou): no Gerenciador de Tarefas, encerre `pocketbase.exe` e os `node.exe`.

---

## 9. Solução de problemas

| Sintoma | Causa provável / solução |
|---|---|
| `node` não é reconhecido | Node não instalado ou fora do PATH → reinstale (1.1.a) e **reinicie a máquina**. |
| PocketBase não baixa | Sem internet → baixe manualmente e ponha o `pocketbase.exe` em `pocketbase\` (1.1.b). |
| "Porta já em uso" | Outra execução ficou aberta → o `deploy.bat` já tenta matar; se persistir, encerre `pocketbase.exe`/`node.exe` no Gerenciador de Tarefas. |
| Login do painel falha | O PocketBase pode não ter subido → veja a janela minimizada "ATMLog-PocketBase". Confirme que `:8090` responde em `http://<IP>:8090/_/`. |
| Front abre mas "não conecta" / tabelas vazias | A API (3001) não subiu, ou o firewall bloqueou. Rode como **Administrador**. Teste `http://<IP>:3001/api/health`. |
| Outro PC na rede não acessa | Firewall do Windows / rede. As regras são criadas pelo `deploy.bat` (rode como Admin). Confirme que estão na mesma rede. |
| Mudei o front mas não aparece | Você esqueceu de copiar o **novo `dist`** para `public\` e reiniciar (6.1). Limpe o cache do navegador (Ctrl+F5). |

---

## 10. Pendências conhecidas (para versões futuras)
- Senhas dos usuários ainda em **texto puro** no banco (mantido desta 1ª versão).
- `GET /api/admin/transportes` e `/api/admin/locais` são **públicos** (o app público depende disso).
- Recomendado restringir o acesso à rede (a API e o banco ficam abertos na rede local).

> Essas pendências estão registradas como *issues* no repositório do projeto.
