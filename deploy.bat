@echo off
title ATMLog - Servidor de Producao
color 0B
setlocal enabledelayedexpansion

echo.
echo  ============================================================
echo     ATMLog - Inicializacao do Servidor (Express + PocketBase)
echo  ============================================================
echo.

:: ---- 1. Permissoes de Administrador ----
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo  [!] Este script precisa de permissoes de Administrador.
    echo      Clique com o botao direito e "Executar como administrador".
    echo.
    pause
    exit /b 1
)
echo  [OK] Rodando como Administrador

:: ---- 2. Diretorio base ----
set "BASEDIR=%~dp0"
cd /d "%BASEDIR%"
set "PB_DIR=%BASEDIR%pocketbase"
set "PB_EXE=%PB_DIR%\pocketbase.exe"
set "PB_VERSION=0.36.7"

:: ---- 3. Node.js ----
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERRO] Node.js nao encontrado no PATH! Instale o Node 18+ e tente de novo.
    pause
    exit /b 1
)
echo  [OK] Node.js encontrado

:: ---- 4. PocketBase (baixa se nao existir) ----
if not exist "%PB_EXE%" (
    echo  [..] PocketBase nao encontrado. Baixando v%PB_VERSION%...
    if not exist "%PB_DIR%" mkdir "%PB_DIR%"
    set "PB_URL=https://github.com/pocketbase/pocketbase/releases/download/v%PB_VERSION%/pocketbase_%PB_VERSION%_windows_amd64.zip"
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '!PB_URL!' -OutFile '%TEMP%\pbatm.zip'; Expand-Archive -Path '%TEMP%\pbatm.zip' -DestinationPath '%PB_DIR%' -Force"
    if not exist "%PB_EXE%" (
        echo  [ERRO] Falha ao baixar/extrair o PocketBase. Baixe manualmente para: %PB_DIR%
        pause
        exit /b 1
    )
    echo  [OK] PocketBase baixado
) else (
    echo  [OK] PocketBase encontrado
)

if not exist "%PB_DIR%\pb_migrations" (
    echo  [AVISO] Pasta pb_migrations nao encontrada em %PB_DIR%. As colecoes NAO serao criadas!
    pause
)

:: ---- 5. Arquivo .env ----
if not exist "%BASEDIR%.env" (
    echo  [..] .env nao encontrado. Criando a partir do .env.example...
    copy /y "%BASEDIR%.env.example" "%BASEDIR%.env" >nul
    echo  [AVISO] Edite o arquivo .env (senha do PB e segredos JWT) e rode de novo.
    notepad "%BASEDIR%.env"
    pause
)

:: Le credenciais do PocketBase do .env
set "PB_ADMIN_EMAIL="
set "PB_ADMIN_PASSWORD="
for /f "usebackq tokens=1,* delims==" %%a in ("%BASEDIR%.env") do (
    if /i "%%a"=="PB_ADMIN_EMAIL" set "PB_ADMIN_EMAIL=%%b"
    if /i "%%a"=="PB_ADMIN_PASSWORD" set "PB_ADMIN_PASSWORD=%%b"
)
if "%PB_ADMIN_EMAIL%"=="" set "PB_ADMIN_EMAIL=admin@atmlog.local"
if "%PB_ADMIN_PASSWORD%"=="" set "PB_ADMIN_PASSWORD=ChangeMe_ATMLog_2026"
echo  [OK] .env carregado (superuser: %PB_ADMIN_EMAIL%)

:: ---- 6. Dependencias Node ----
if not exist "%BASEDIR%node_modules" (
    echo  [..] Instalando dependencias (npm install)...
    call npm install
    if %errorlevel% neq 0 (
        echo  [ERRO] npm install falhou.
        pause
        exit /b 1
    )
)
echo  [OK] Dependencias Node prontas

:: ---- 7. Builds dos frontends (apenas aviso) ----
if not exist "%BASEDIR%public\client\index.html" echo  [AVISO] Build do Client ausente em public\client (copie o dist do npm run build).
if not exist "%BASEDIR%public\admin\index.html"  echo  [AVISO] Build do Admin ausente em public\admin (copie o dist do npm run build).

echo.
echo  --- Configurando Firewall ---
call :firewall "ATMLog - PocketBase (8090)" 8090
call :firewall "ATMLog - API (3001)" 3001
call :firewall "ATMLog - Client (8080)" 8080
call :firewall "ATMLog - Admin (8082)" 8082

echo.
echo  --- Parando processos anteriores ---
taskkill /f /im pocketbase.exe >nul 2>&1
call :killport 8090
call :killport 3001
call :killport 8080
call :killport 8082
echo  [OK] Processos anteriores encerrados
timeout /t 2 /nobreak >nul

:: ---- 8. Superuser do PocketBase (antes do serve) ----
echo.
echo  --- Configurando PocketBase ---
pushd "%PB_DIR%"
"%PB_EXE%" superuser upsert "%PB_ADMIN_EMAIL%" "%PB_ADMIN_PASSWORD%" >nul 2>&1
if errorlevel 1 "%PB_EXE%" superuser create "%PB_ADMIN_EMAIL%" "%PB_ADMIN_PASSWORD%" >nul 2>&1
popd
echo  [OK] Superuser garantido

:: ---- 9. Inicia o PocketBase (aplica migrations no serve) ----
echo  [1/3] Iniciando PocketBase (porta 8090)...
start "ATMLog-PocketBase" /min cmd /c "cd /d "%PB_DIR%" && "%PB_EXE%" serve --http=0.0.0.0:8090"
timeout /t 5 /nobreak >nul
netstat -an | findstr ":8090" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [AVISO] PocketBase pode nao ter iniciado. Veja a janela minimizada.
) else (
    echo  [OK] PocketBase rodando na porta 8090
)

:: ---- 10. Popula o banco (idempotente) ----
echo  [2/3] Populando o banco (seed)...
pushd "%BASEDIR%"
call node seed.js
popd

:: ---- 11. Inicia o servidor Node (API + frontends) ----
echo  [3/3] Iniciando o servidor Web (API 3001 / Client 8080 / Admin 8082)...
start "ATMLog-Server" /min cmd /c "cd /d "%BASEDIR%" && node server.js"
timeout /t 4 /nobreak >nul
netstat -an | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [AVISO] Servidor Web pode nao ter iniciado. Veja a janela minimizada.
) else (
    echo  [OK] Servidor Web rodando
)

:: ---- 12. Detecta IP ----
set "LOCAL_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    if not defined LOCAL_IP set "LOCAL_IP=%%a"
)
set "LOCAL_IP=%LOCAL_IP: =%"
if "%LOCAL_IP%"=="" set "LOCAL_IP=localhost"

echo.
echo  ============================================================
echo     ATMLog INICIADO COM SUCESSO!
echo  ============================================================
echo.
echo     Front Publico:    http://%LOCAL_IP%:8080
echo     Painel Admin:     http://%LOCAL_IP%:8082
echo     API:              http://%LOCAL_IP%:3001/api
echo     PocketBase Admin: http://%LOCAL_IP%:8090/_/
echo.
echo     Login inicial do painel: admin@comau.com / admin123
echo  ============================================================
echo     Pressione qualquer tecla para PARAR os servidores.
echo  ============================================================
pause >nul

echo.
echo  Parando servicos...
taskkill /f /im pocketbase.exe >nul 2>&1
call :killport 3001
call :killport 8080
call :killport 8082
call :killport 8090
echo  [OK] Servicos encerrados.
timeout /t 2 /nobreak >nul
exit /b 0

:: ===================== SUB-ROTINAS =====================
:firewall
netsh advfirewall firewall show rule name=%1 >nul 2>&1
if errorlevel 1 (
    netsh advfirewall firewall add rule name=%1 dir=in action=allow protocol=TCP localport=%2 >nul 2>&1
    echo  [+] Regra de firewall criada: %1
) else (
    echo  [OK] Regra de firewall ja existe: %1
)
exit /b 0

:killport
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr ":%1" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%p >nul 2>&1
)
exit /b 0
