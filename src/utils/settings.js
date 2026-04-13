const { query } = require('./database');

// Cache em memória para acesso síncrono
let cache = {};

/**
 * Carrega todas as configurações do banco para o cache em memória
 * Deve ser chamado uma vez no startup do bot
 */
async function loadSettingsCache() {
    try {
        const rows = await query('SELECT `key`, `value` FROM settings');
        cache = {};
        for (const row of rows) {
            cache[row.key] = row.value;
        }
        console.log(`⚙️ Cache de settings carregado (${rows.length} configurações)`);
    } catch (e) {
        console.error('Erro ao carregar settings cache:', e);
    }
    return cache;
}

/**
 * Retorna todas as configurações do cache (síncrono)
 */
function getSettings() {
    return { ...cache };
}

/**
 * Salva uma configuração (atualiza cache + banco)
 */
async function saveSetting(key, value) {
    cache[key] = value;
    await query(
        'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
        [key, value]
    );
    return cache;
}

/**
 * Lê uma configuração do cache (síncrono)
 */
function getSetting(key) {
    return cache[key] || null;
}

/**
 * Remove uma configuração (atualiza cache + banco)
 */
async function removeSetting(key) {
    delete cache[key];
    await query('DELETE FROM settings WHERE `key` = ?', [key]);
    return cache;
}

module.exports = { loadSettingsCache, getSettings, saveSetting, getSetting, removeSetting };
