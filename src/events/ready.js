const { ActivityType } = require('discord.js');

module.exports = (client) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Bot online como: ${client.user.tag}`);
    console.log(`📡 Servidores: ${client.guilds.cache.size}`);
    console.log(`👥 Usuários: ${client.users.cache.size}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Definir status/atividade
    client.user.setPresence({
        activities: [{
            name: 'Detroit Roleplay',
            type: ActivityType.Watching,
        }],
        status: 'dnd', // vermelho combina com a identidade visual
    });

    const { updateMemberCounter } = require('../utils/memberCounter');
    
    // Atualizar contador de membros na inicialização e a cada 6 minutos (para evitar limite da API do Discord)
    updateMemberCounter(client);
    setInterval(() => updateMemberCounter(client), 6 * 60 * 1000);
};
