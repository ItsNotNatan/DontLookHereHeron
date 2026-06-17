import sql from 'mssql';

// Configurações da conexão
const dbConfig = {
    user: 'CM04641',            // Confirme se é o usuário correto
    password: 'atmlog@2026',    // Confirme a senha
    server: 'UBRBET01APRP370',   // ATENÇÃO: Apenas o nome da máquina aqui, SEM a barra
    database: 'BANCO_ATM ',  // O banco que ele tem acesso
    options: {
        instanceName: 'SQLEXPRESS',     // O nome da instância fica aqui
        encrypt: false,                 
        trustServerCertificate: true,   
        connectTimeout: 30000           // Aumentamos o limite para 30 segundos
    }
};

async function testarBanco() {
    console.log("=== INICIANDO TESTE DE CONEXÃO ===");
    console.log('Servidor alvo: ${dbConfig.server}');
    console.log('Instância: ${dbConfig.options.instanceName}');
    console.log('Banco de dados: ${dbConfig.database}');
    console.log('Usuário: ${dbConfig.user}');
    console.log("-----------------------------------");
    console.log("Aguardando resposta do servidor (isso pode levar até 30s)...");

    try {
        // Tenta estabelecer a conexão
        const pool = await sql.connect(dbConfig);
        
        console.log("\n✅ SUCESSO: Conexão física estabelecida!");
        
        console.log("Executando query de teste...");
        const resultado = await pool.request().query('SELECT @@VERSION as Versao');
        
        console.log("✅ DADOS RECEBIDOS:");
        console.log(resultado.recordset[0].Versao);

        // Fecha a conexão
        await sql.close();
        console.log("\n=== TESTE FINALIZADO COM SUCESSO ===");

    } catch (erro) {
        console.error("\n❌ FALHA NA CONEXÃO. DETALHES DO ERRO:");
        console.error("Código:", erro.code);
        console.error("Mensagem original:", erro.message);
        
        if (erro.code === 'ETIMEOUT' || erro.message.includes('15000ms') || erro.message.includes('30000ms')) {
            console.log("\n💡 DIAGNÓSTICO:");
            console.log("O servidor não respondeu a tempo. Isso indica que o SQL Server não está aceitando conexões de rede.");
            console.log("Para resolver, você precisa habilitar o TCP/IP no 'SQL Server Configuration Manager'.");
        }
    }
}

// Executa a função
testarBanco();