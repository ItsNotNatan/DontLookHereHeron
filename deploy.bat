@echo off
rem ===========================================================
rem  ATMLog - Deploy (com log automatico)
rem  Esta versao grava tudo em deploy-log.txt e abre o log no
rem  final, entao a janela nunca "fecha sem deixar pista".
rem ===========================================================
if "%~1"=="_run" goto run

call "%~f0" _run 1> "%~dp0deploy-log.txt" 2>&1
start "" notepad "%~dp0deploy-log.txt"
exit /b

:run
setlocal enableextensions enabledelayedexpansion
set "BASEDIR=%~dp0"
cd /d "%BASEDIR%"
set "PB_DIR=%BASEDIR%pocketbase"
set "PB_EXE=%PB_DIR%\pocketbase.exe"
set "PB_VERSION=0.36.7"

echo ============================================================
echo  ATMLog - Deploy
echo  Data : %date% %time%
echo  Pasta: %BASEDIR%
echo ============================================================

rem --- Administrador (apenas aviso) ---
net session >nul 2>&1
if errorlevel 1 (
  echo [AVISO] NAO esta como Administrador. As regras de firewall podem falhar
  echo         e outras maquinas talvez nao consigam acessar. Para acesso na
  echo         rede, rode como administrador.
) else (
  echo [OK] Administrador
)

rem --- Node.js ---
where node >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado no PATH. Instale o Node 18+ ^(nodejs.org^) e rode de novo.
  goto fim
)
for /f "delims=" %%v in ('node -v') do echo [OK] Node %%v

rem --- PocketBase (baixa se faltar) ---
if not exist "%PB_EXE%" (
  echo [..] Baixando PocketBase v%PB_VERSION% ...
  if not exist "%PB_DIR%" mkdir "%PB_DIR%"
  set "PB_URL=https://github.com/pocketbase/pocketbase/releases/download/v%PB_VERSION%/pocketbase_%PB_VERSION%_windows_amd64.zip"
  powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '!PB_URL!' -OutFile '%TEMP%\pbatm.zip'; Expand-Archive -Path '%TEMP%\pbatm.zip' -DestinationPath '%PB_DIR%' -Force"
  if not exist "%PB_EXE%" (
    echo [ERRO] Falha ao baixar/extrair o PocketBase. Verifique a internet.
    goto fim
  )
  echo [OK] PocketBase baixado
) else (
  echo [OK] PocketBase encontrado
)

if not exist "%PB_DIR%\pb_migrations" echo [AVISO] pasta pb_migrations ausente - as colecoes podem nao ser criadas.

rem --- .env (cria com padrao se faltar) ---
if not exist "%BASEDIR%.env" (
  copy /y "%BASEDIR%.env.example" "%BASEDIR%.env" >nul
  echo [OK] .env criado a partir do .env.example ^(troque as senhas depois^)
) else (
  echo [OK] .env encontrado
)

rem le credenciais do PocketBase do .env
set "PB_ADMIN_EMAIL="
set "PB_ADMIN_PASSWORD="
for /f "usebackq tokens=1,* delims==" %%a in ("%BASEDIR%.env") do (
  if /i "%%a"=="PB_ADMIN_EMAIL" set "PB_ADMIN_EMAIL=%%b"
  if /i "%%a"=="PB_ADMIN_PASSWORD" set "PB_ADMIN_PASSWORD=%%b"
)
if "%PB_ADMIN_EMAIL%"=="" set "PB_ADMIN_EMAIL=admin@atmlog.local"
if "%PB_ADMIN_PASSWORD%"=="" set "PB_ADMIN_PASSWORD=ChangeMe_ATMLog_2026"
echo [OK] superuser do banco: %PB_ADMIN_EMAIL%

rem --- Dependencias (npm install) ---
if not exist "%BASEDIR%node_modules\dotenv" (
  echo [..] Instalando dependencias ^(npm install - pode levar 1-2 min^)...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo [ERRO] npm install falhou.
    goto fim
  )
)
echo [OK] dependencias prontas

rem --- Builds dos frontends (aviso) ---
if not exist "%BASEDIR%public\client\index.html" echo [AVISO] build do Client ausente em public\client
if not exist "%BASEDIR%public\admin\index.html"  echo [AVISO] build do Admin ausente em public\admin

rem --- Firewall (precisa de admin; ignora erro) ---
call :fw ATMLog-PB-8090 8090
call :fw ATMLog-API-3001 3001
call :fw ATMLog-Client-8080 8080
call :fw ATMLog-Admin-8082 8082

rem --- Encerra execucoes anteriores ---
taskkill /f /im pocketbase.exe >nul 2>&1
call :kill 8090
call :kill 3001
call :kill 8080
call :kill 8082

rem --- Superuser do PocketBase ---
pushd "%PB_DIR%"
"%PB_EXE%" superuser upsert "%PB_ADMIN_EMAIL%" "%PB_ADMIN_PASSWORD%"
if errorlevel 1 "%PB_EXE%" superuser create "%PB_ADMIN_EMAIL%" "%PB_ADMIN_PASSWORD%"
popd
echo [OK] superuser configurado

rem --- Inicia o PocketBase (janela minimizada, independente) ---
echo [1/3] Iniciando PocketBase na porta 8090...
start "ATMLog-PocketBase" /min /d "%PB_DIR%" "%PB_EXE%" serve --http=0.0.0.0:8090
ping -n 7 127.0.0.1 >nul
netstat -an | findstr ":8090" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (echo [AVISO] PocketBase pode nao ter subido - veja a janela ATMLog-PocketBase) else (echo [OK] PocketBase rodando)

rem --- Popula o banco (idempotente) ---
echo [2/3] Populando o banco ^(seed^)...
call node "%BASEDIR%seed.js"

rem --- Inicia o servidor Node (API + frontends) ---
echo [3/3] Iniciando o servidor ^(API 3001 / Client 8080 / Admin 8082^)...
start "ATMLog-Server" /min /d "%BASEDIR%" node server.js
ping -n 5 127.0.0.1 >nul
netstat -an | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if errorlevel 1 (echo [AVISO] Servidor pode nao ter subido - veja a janela ATMLog-Server) else (echo [OK] Servidor rodando)

rem --- Detecta IP ---
set "LOCAL_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do if not defined LOCAL_IP set "LOCAL_IP=%%a"
if defined LOCAL_IP set "LOCAL_IP=%LOCAL_IP: =%"
if not defined LOCAL_IP set "LOCAL_IP=localhost"

echo.
echo ============================================================
echo   ATMLog INICIADO!
echo.
echo   Front Publico : http://%LOCAL_IP%:8080
echo   Painel Admin  : http://%LOCAL_IP%:8082   ^(admin@comau.com / admin123^)
echo   PocketBase    : http://%LOCAL_IP%:8090/_/
echo ============================================================
echo   IMPORTANTE: as janelas minimizadas "ATMLog-PocketBase" e
echo   "ATMLog-Server" precisam ficar ABERTAS para o sistema rodar.
echo   Para parar tudo, feche essas duas janelas.
echo ============================================================

:fim
echo.
echo ----- fim do deploy ^(log salvo em deploy-log.txt^) -----
exit /b

rem ================= SUB-ROTINAS =================
:fw
netsh advfirewall firewall show rule name="%~1" >nul 2>&1
if errorlevel 1 (
  netsh advfirewall firewall add rule name="%~1" dir=in action=allow protocol=TCP localport=%~2 >nul 2>&1
  echo [OK] firewall: regra %~1 criada
) else (
  echo [OK] firewall: regra %~1 ja existe
)
exit /b

:kill
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":%~1" ^| findstr "LISTENING"') do taskkill /f /pid %%p >nul 2>&1
exit /b
