require('dotenv').config();
const { getSetting } = require('./utils/settings');

module.exports = {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,

    // IDs dinâmicos - busca primeiro do painel de config (JSON), depois do .env
    get guildId() {
        return getSetting('guildId') || process.env.GUILD_ID || null;
    },
    get ticketCategoryId() {
        return getSetting('ticketCategoryId') || process.env.TICKET_CATEGORY_ID || null;
    },
    get permanentCategoryId() {
        return getSetting('permanentCategoryId') || null;
    },
    get logChannelId() {
        return getSetting('logChannelId') || process.env.LOG_CHANNEL_ID || null;
    },
    get staffRoleId() {
        return getSetting('staffRoleId') || process.env.STAFF_ROLE_ID || null;
    },
    get denunciasChannelId() {
        return getSetting('denunciasChannelId') || null;
    },
    get automodLogChannelId() {
        return getSetting('automodLogChannelId') || process.env.AUTOMOD_LOG_CHANNEL_ID || null;
    },
    get linkFilterEnabled() {
        return getSetting('linkFilterEnabled') === 'true';
    },

    // ── Auto-Moderação: Regras ──
    antiFlood: {
        maxMessages: 5,
        timeWindowMs: 4000, // 5 mensagens em 4 segundos aciona o anti-flood
    },
    // Palavras bloqueadas padrão (Pode ser atualizado conforme demanda)
    badWords: [
        'fdp', 'vtnc', 'filho da puta', 'arrombado', 'vsf', 'vai se fuder', 
        'desgraça', 'corno', 'puta', 'vagabundo'
    ],

    // Cores do tema Detroit Roleplay (vermelho/preto)
    colors: {
        primary: 0xE80000,    // Vermelho Detroit
        secondary: 0x2B2D31,  // Cinza escuro Discord
        success: 0x2ECC71,    // Verde
        warning: 0xF1C40F,    // Amarelo
        danger: 0xE74C3C,     // Vermelho erro
        info: 0x3498DB,       // Azul info
    },

    // Emojis
    emojis: {
        ticket: '🎫',
        compras: '💰',
        suporte: '🔧',
        denuncia: '📢',
        revisao: '⚠️',
        consulta: '🔍',
        fechar: '🔒',
        alerta: '📢',
    }
};
