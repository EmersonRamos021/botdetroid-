require('dotenv').config();
const { getPool, initDatabase } = require('./src/utils/database');

async function main() {
    await initDatabase();
    const pool = getPool();
    const query = `
        CREATE TABLE IF NOT EXISTS tickets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            channel_name VARCHAR(255) NOT NULL,
            owner_id VARCHAR(255) NOT NULL,
            owner_tag VARCHAR(255) NOT NULL,
            ticket_type VARCHAR(100) NOT NULL,
            closed_by VARCHAR(255) NOT NULL,
            closed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            transcript_html LONGTEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    try {
        await pool.execute(query);
        console.log("✅ Tabela tickets criada com sucesso!");
    } catch (e) {
        console.error("❌ Erro:", e.message);
    } finally {
        await pool.end();
    }
}

main();
