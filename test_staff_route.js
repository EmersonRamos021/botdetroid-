?const fs = require('fs');
const mysql = require('mysql2/promise');

async function test() {
  try {
    const envFile = fs.readFileSync('.env', 'utf8');
    const dbUrlMatch = envFile.match(/DATABASE_URL=["']?([^"'\n]+)/);
    if (!dbUrlMatch) throw new Error("DATABASE_URL not found");

    const dbUrl = dbUrlMatch[1];
    const db = await mysql.createConnection({
      uri: dbUrl,
      ssl: { rejectUnauthorized: false }
    });

    console.log("Conectado ao DB. Executando query da rota...");

    // Simula a ensureTableExists() para name
    try {
      await db.execute("ALTER TABLE ticket_staff ADD COLUMN name VARCHAR(255) DEFAULT NULL");
    } catch (e) {
      console.log("Alter table name:", e.message);
    }

    try {
      const [rows] = await db.execute(`
        SELECT 
          ts.id, 
          ts.name, 
          ts.discord_id, 
          ts.categories,
          COUNT(t.id) as total_tickets,
          AVG(t.rating) as average_rating
        FROM ticket_staff ts
        LEFT JOIN tickets t ON ts.discord_id COLLATE utf8mb4_unicode_ci = t.closed_by_id COLLATE utf8mb4_unicode_ci
        GROUP BY ts.id, ts.name, ts.discord_id, ts.categories
        ORDER BY ts.id ASC
      `);
      console.log("Resultado GET:", rows);
    } catch (e) {
      console.error("Erro no GET:", e.message);
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
test();
