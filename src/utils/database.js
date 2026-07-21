const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;

/**
 * Retorna o pool de conexões MySQL
 */
function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            uri: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
    }
    return pool;
}

/**
 * Inicializa o banco de dados criando todas as tabelas necessárias
 */
async function initDatabase() {
    const db = getPool();

    // Testar conexão
    try {
        const conn = await db.getConnection();
        console.log('✅ Conectado ao MySQL com sucesso!');
        conn.release();
    } catch (error) {
        console.error('❌ Falha ao conectar no MySQL:', error.message);
        process.exit(1);
    }

    // Tabela de configurações
    await db.execute(`
        CREATE TABLE IF NOT EXISTS settings (
            \`key\` VARCHAR(100) PRIMARY KEY,
            \`value\` TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    // Tabela de contadores (tickets)
    await db.execute(`
        CREATE TABLE IF NOT EXISTS counters (
            name VARCHAR(50) PRIMARY KEY,
            count INT NOT NULL DEFAULT 0
        )
    `);

    // Inserir contadores iniciais se não existirem
    await db.execute(`INSERT IGNORE INTO counters (name, count) VALUES ('ticket', 0)`);
    await db.execute(`INSERT IGNORE INTO counters (name, count) VALUES ('denuncia', 0)`);
    await db.execute(`INSERT IGNORE INTO counters (name, count) VALUES ('revisao', 0)`);

    // Tabela de tickets fechados (Transcrições HTML)
    await db.execute(`
        CREATE TABLE IF NOT EXISTS tickets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            channel_name VARCHAR(100) NOT NULL,
            owner_id VARCHAR(30) NOT NULL,
            owner_tag VARCHAR(100) NOT NULL,
            ticket_type VARCHAR(50) NOT NULL,
            closed_by VARCHAR(100) NOT NULL,
            closed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            transcript_html LONGTEXT NOT NULL,
            INDEX idx_owner (owner_id)
        )
    `);

    // Tabela de relatórios (casos unificados — denúncia + revisão no mesmo registro)
    await db.execute(`
        CREATE TABLE IF NOT EXISTS reports (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(20) UNIQUE NOT NULL,
            type ENUM('denuncia', 'revisao') NOT NULL,
            user_id VARCHAR(30) NOT NULL,
            user_tag VARCHAR(100) NOT NULL,
            id_infrator VARCHAR(30) DEFAULT NULL,
            motivo TEXT DEFAULT NULL,
            codigo_original VARCHAR(20) DEFAULT NULL,
            motivo_revisao TEXT DEFAULT NULL,
            link_provas VARCHAR(500) DEFAULT NULL,
            status ENUM('pendente', 'em_analise', 'aprovada', 'negada', 'concluida') DEFAULT 'pendente',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_by VARCHAR(30) DEFAULT NULL,
            resolved_tag VARCHAR(100) DEFAULT NULL,
            staff_reason TEXT DEFAULT NULL,
            resolved_at TIMESTAMP NULL DEFAULT NULL,
            message_id VARCHAR(30) DEFAULT NULL,
            revisao_user_id VARCHAR(30) DEFAULT NULL,
            revisao_user_tag VARCHAR(100) DEFAULT NULL,
            revisao_motivo TEXT DEFAULT NULL,
            revisao_link_provas VARCHAR(500) DEFAULT NULL,
            revisao_created_at TIMESTAMP NULL DEFAULT NULL,
            revisao_status ENUM('pendente', 'em_analise', 'aprovada', 'negada') DEFAULT NULL,
            revisao_resolved_by VARCHAR(30) DEFAULT NULL,
            revisao_resolved_tag VARCHAR(100) DEFAULT NULL,
            revisao_staff_reason TEXT DEFAULT NULL,
            revisao_resolved_at TIMESTAMP NULL DEFAULT NULL,
            revisao_message_id VARCHAR(30) DEFAULT NULL,
            INDEX idx_code (code),
            INDEX idx_type (type),
            INDEX idx_status (status)
        )
    `);

    // Tabela de VIPs Automáticos
    await db.execute(`
        CREATE TABLE IF NOT EXISTS active_vips (
            id INT AUTO_INCREMENT PRIMARY KEY,
            discord_id VARCHAR(50) NOT NULL,
            role_id VARCHAR(50) NOT NULL,
            order_code VARCHAR(100),
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Migration: adicionar colunas novas (caso a tabela já exista sem elas)
    const newColumns = [
        { name: 'resolved_by', definition: 'VARCHAR(30) DEFAULT NULL' },
        { name: 'resolved_tag', definition: 'VARCHAR(100) DEFAULT NULL' },
        { name: 'staff_reason', definition: 'TEXT DEFAULT NULL' },
        { name: 'resolved_at', definition: 'TIMESTAMP NULL DEFAULT NULL' },
        { name: 'message_id', definition: 'VARCHAR(30) DEFAULT NULL' },
        { name: 'revisao_user_id', definition: 'VARCHAR(30) DEFAULT NULL' },
        { name: 'revisao_user_tag', definition: 'VARCHAR(100) DEFAULT NULL' },
        { name: 'revisao_motivo', definition: 'TEXT DEFAULT NULL' },
        { name: 'revisao_link_provas', definition: 'VARCHAR(500) DEFAULT NULL' },
        { name: 'revisao_created_at', definition: 'TIMESTAMP NULL DEFAULT NULL' },
        { name: 'revisao_status', definition: "ENUM('pendente', 'em_analise', 'aprovada', 'negada') DEFAULT NULL" },
        { name: 'revisao_resolved_by', definition: 'VARCHAR(30) DEFAULT NULL' },
        { name: 'revisao_resolved_tag', definition: 'VARCHAR(100) DEFAULT NULL' },
        { name: 'revisao_staff_reason', definition: 'TEXT DEFAULT NULL' },
        { name: 'revisao_resolved_at', definition: 'TIMESTAMP NULL DEFAULT NULL' },
        { name: 'revisao_message_id', definition: 'VARCHAR(30) DEFAULT NULL' },
    ];

    for (const col of newColumns) {
        try {
            await db.execute(`ALTER TABLE reports ADD COLUMN ${col.name} ${col.definition}`);
        } catch (e) {
            // Coluna já existe — ignora silenciosamente
            if (e.code !== 'ER_DUP_FIELDNAME') throw e;
        }
    }

    console.log('📦 Tabelas do banco de dados verificadas/criadas com sucesso!');
}

/**
 * Executa uma query SQL e retorna o resultado
 * Para SELECT: retorna array de rows
 * Para INSERT/UPDATE/DELETE: retorna ResultSetHeader (affectedRows, insertId, etc.)
 */
async function query(sql, params = []) {
    const db = getPool();
    const [rows] = await db.execute(sql, params);
    return rows;
}

/**
 * Incrementa um contador atomicamente e retorna o novo valor
 */
async function getNextCount(name) {
    const db = getPool();
    await db.execute(
        'UPDATE counters SET count = LAST_INSERT_ID(count + 1) WHERE name = ?',
        [name]
    );
    const [rows] = await db.execute('SELECT LAST_INSERT_ID() as val');
    return rows[0].val;
}

module.exports = { getPool, initDatabase, query, getNextCount };
