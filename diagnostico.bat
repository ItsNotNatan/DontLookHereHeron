@echo off
setlocal
set "REPORT=%~dp0diagnostico.txt"
set "DIR=%~dp0"

echo ============================================================ > "%REPORT%"
echo  DIAGNOSTICO ATMLog >> "%REPORT%"
echo ============================================================ >> "%REPORT%"
echo Data/Hora : %date% %time% >> "%REPORT%"
echo Usuario   : %USERNAME% >> "%REPORT%"
echo Maquina   : %COMPUTERNAME% >> "%REPORT%"
echo Pasta     : %DIR% >> "%REPORT%"
echo. >> "%REPORT%"

echo --- NODE.JS --- >> "%REPORT%"
where node >> "%REPORT%" 2>&1
node -v >> "%REPORT%" 2>&1
call npm -v >> "%REPORT%" 2>&1
echo. >> "%REPORT%"

echo --- ARQUIVOS DO PACOTE --- >> "%REPORT%"
if exist "%DIR%server.js" (echo [OK]    server.js)>>"%REPORT%"
if not exist "%DIR%server.js" (echo [FALTA] server.js)>>"%REPORT%"
if exist "%DIR%seed.js" (echo [OK]    seed.js)>>"%REPORT%"
if not exist "%DIR%seed.js" (echo [FALTA] seed.js)>>"%REPORT%"
if exist "%DIR%package.json" (echo [OK]    package.json)>>"%REPORT%"
if not exist "%DIR%package.json" (echo [FALTA] package.json)>>"%REPORT%"
if exist "%DIR%.env" (echo [OK]    .env)>>"%REPORT%"
if not exist "%DIR%.env" (echo [AVISO] .env ainda nao criado - normal antes do 1o deploy)>>"%REPORT%"
if exist "%DIR%node_modules" (echo [OK]    node_modules)>>"%REPORT%"
if not exist "%DIR%node_modules" (echo [AVISO] node_modules ausente - o deploy roda npm install)>>"%REPORT%"
if exist "%DIR%pocketbase\pocketbase.exe" (echo [OK]    pocketbase\pocketbase.exe)>>"%REPORT%"
if not exist "%DIR%pocketbase\pocketbase.exe" (echo [AVISO] pocketbase.exe ausente - o deploy baixa sozinho)>>"%REPORT%"
if exist "%DIR%pocketbase\pb_migrations" (echo [OK]    pocketbase\pb_migrations)>>"%REPORT%"
if not exist "%DIR%pocketbase\pb_migrations" (echo [FALTA] pocketbase\pb_migrations)>>"%REPORT%"
if exist "%DIR%public\client\index.html" (echo [OK]    public\client\index.html)>>"%REPORT%"
if not exist "%DIR%public\client\index.html" (echo [FALTA] public\client\index.html)>>"%REPORT%"
if exist "%DIR%public\admin\index.html" (echo [OK]    public\admin\index.html)>>"%REPORT%"
if not exist "%DIR%public\admin\index.html" (echo [FALTA] public\admin\index.html)>>"%REPORT%"
if exist "%DIR%seed\locais_base.json" (echo [OK]    seed\locais_base.json)>>"%REPORT%"
if not exist "%DIR%seed\locais_base.json" (echo [FALTA] seed\locais_base.json)>>"%REPORT%"
echo. >> "%REPORT%"

echo --- PORTAS EM USO (8090 / 3001 / 8080 / 8082) --- >> "%REPORT%"
netstat -ano | findstr ":8090 :3001 :8080 :8082" >> "%REPORT%" 2>&1
echo. >> "%REPORT%"

echo --- PERMISSAO --- >> "%REPORT%"
net session >nul 2>&1
if errorlevel 1 (echo Rodando SEM admin)>>"%REPORT%"
if not errorlevel 1 (echo Rodando COMO admin)>>"%REPORT%"
echo. >> "%REPORT%"
echo ============================================================ >> "%REPORT%"
echo  FIM >> "%REPORT%"
echo ============================================================ >> "%REPORT%"

type "%REPORT%"
echo.
echo Relatorio tambem salvo em: %REPORT%
echo Me envie o texto acima ^(ou o arquivo diagnostico.txt^).
echo.
pause
