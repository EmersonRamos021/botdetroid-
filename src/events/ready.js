const { ActivityType } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const config = require('../config');

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
    const { updateStatusPanel } = require('../utils/statusPanel');
    
    // Atualizar contador de membros na inicialização e a cada 6 minutos (para evitar limite da API do Discord)
    updateMemberCounter(client);
    setInterval(() => updateMemberCounter(client), 6 * 60 * 1000);

    // Atualizar Painel Fixo de Status do Servidor MTA a cada 2 minutos
    updateStatusPanel(client);
    setInterval(() => updateStatusPanel(client), 2 * 60 * 1000);

    // Conectar o bot automaticamente em uma Call de Voz
    const voiceChannelId = '1521699106982985829';
    const guildId = config.guildId; // Pega o guildId das configurações
    
    if (guildId && voiceChannelId) {
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
            const voiceChannel = guild.channels.cache.get(voiceChannelId);
            if (voiceChannel && voiceChannel.isVoiceBased()) {
                try {
                    joinVoiceChannel({
                        channelId: voiceChannel.id,
                        guildId: guild.id,
                        adapterCreator: guild.voiceAdapterCreator,
                        selfDeaf: true,
                        selfMute: true // Entrar mutado para economizar recursos
                    });
                    console.log(`🔊 Bot conectado com sucesso na call de voz: ${voiceChannel.name}`);
                } catch (error) {
                    console.error('⚠️ Erro ao conectar na call de voz:', error.message);
                }
            } else {
                console.error(`⚠️ Canal de voz ${voiceChannelId} não encontrado no servidor.`);
            }
        }
    }
};
