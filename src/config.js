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
    get ticketCategoryCompras() {
        return getSetting('ticketCategoryCompras') || null;
    },
    get ticketCategorySuporte() {
        return getSetting('ticketCategorySuporte') || null;
    },
    get ticketCategoryDenuncia() {
        return getSetting('ticketCategoryDenuncia') || null;
    },
    get ticketCategoryRevisao() {
        return getSetting('ticketCategoryRevisao') || null;
    },
    get reviewChannelId() {
        return getSetting('reviewChannelId') || null;
    },
    get supportVoiceChannelId() {
        return getSetting('supportVoiceChannelId') || null;
    },
    get permanentCategoryId() {
        return getSetting('permanentCategoryId') || null;
    },
    get logChannelId() {
        return getSetting('logChannelId') || process.env.LOG_CHANNEL_ID || null;
    },
    get logChatChannelId() {
        return getSetting('logChatChannelId') || null;
    },
    get logVoiceChannelId() {
        return getSetting('logVoiceChannelId') || null;
    },
    get staffRoleId() {
        return getSetting('staffRoleId') || process.env.STAFF_ROLE_ID || null;
    },
    get denunciasChannelId() {
        return getSetting('denunciasChannelId') || null;
    },
    get autoRoleId() {
        return getSetting('autoRoleId') || process.env.AUTO_ROLE_ID || null;
    },
    get automodLogChannelId() {
        return getSetting('automodLogChannelId') || process.env.AUTOMOD_LOG_CHANNEL_ID || null;
    },
    get linkFilterEnabled() {
        return getSetting('linkFilterEnabled') === 'true';
    },
    get memberCounterChannelId() {
        return getSetting('memberCounterChannelId') || null;
    },

    // ── Status do Servidor (MTA) ──
    get mtaServerIp() { return getSetting('mtaServerIp') || null; },
    get mtaServerPort() { return Number(getSetting('mtaServerPort')) || 22003; },
    get mtaSocialStore() { return getSetting('mtaSocialStore') || null; },
    get mtaSocialInsta() { return getSetting('mtaSocialInsta') || null; },
    get mtaSocialTiktok() { return getSetting('mtaSocialTiktok') || null; },
    get mtaSocialYoutube() { return getSetting('mtaSocialYoutube') || null; },
    get statusPanelChannelId() { return getSetting('statusPanelChannelId') || null; },
    get statusPanelMessageId() { return getSetting('statusPanelMessageId') || null; },

    // ── Auto-Moderação: Regras ──
    antiFlood: {
        get maxMessages() { return Number(getSetting('antiFlood_maxMessages')) || 5; },
        get timeWindowMs() { return Number(getSetting('antiFlood_timeWindow')) || 4000; },
    },
    // Palavras bloqueadas padrão (Pode ser atualizado conforme demanda)
    get badWords() {
        const saved = getSetting('badWords_list');
        if (saved) {
            try { return JSON.parse(saved); } catch(e) {}
        }
        return [
            'fdp', 'vtnc', 'filho da puta', 'arrombado', 'vsf', 'vai se fuder', 
            'desgraça', 'corno', 'puta', 'vagabundo'
        ];
    },

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
