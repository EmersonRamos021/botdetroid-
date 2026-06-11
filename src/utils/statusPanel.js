const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const gamedig = require('gamedig');
const config = require('../config');

async function buildStatusPayload() {
    const ip = config.mtaServerIp;
    const port = config.mtaServerPort || 22003;

    let isOnline = false;
    let players = 0;
    let maxPlayers = 0;
    let ping = 0;

    if (ip) {
        try {
            const state = await gamedig.query({
                type: 'mtasa',
                host: ip,
                port: port,
                maxAttempts: 2,
                socketTimeout: 3000,
            });
            isOnline = true;
            players = state.players ? state.players.length : 0;
            maxPlayers = state.maxplayers;
            ping = state.ping;
        } catch (e) {
            isOnline = false;
        }
    }

    const embed = new EmbedBuilder()
        .setColor(isOnline ? config.colors.success : config.colors.danger)
        .setTitle('🚀 CONECTE-SE')
        .setDescription('Acompanhe o status do servidor em tempo real.')
        .addFields(
            { 
                name: 'STATUS', 
                value: isOnline ? '🟢 Online' : '🔴 Offline', 
                inline: true 
            },
            { 
                name: 'JOGADORES', 
                value: `${players}/${maxPlayers}`, 
                inline: true 
            },
            {
                name: 'IP MTA:',
                value: ip ? `\`\`\`connect mtasa://${ip}:${port}\`\`\`` : '\`\`\`Configure o IP no Painel Admin\`\`\`',
                inline: false
            }
        )
        .setFooter({ text: `Atualizado a cada 2 minutos • Detroit Roleplay` })
        .setTimestamp();

    const row = new ActionRowBuilder();

    if (config.mtaSocialStore) {
        row.addComponents(
            new ButtonBuilder()
                .setLabel('Loja')
                .setEmoji('🛒')
                .setURL(config.mtaSocialStore)
                .setStyle(ButtonStyle.Link)
        );
    }
    
    if (config.mtaSocialInsta) {
        row.addComponents(
            new ButtonBuilder()
                .setLabel('Instagram')
                .setEmoji('📸')
                .setURL(config.mtaSocialInsta)
                .setStyle(ButtonStyle.Link)
        );
    }

    if (config.mtaSocialTiktok) {
        row.addComponents(
            new ButtonBuilder()
                .setLabel('TikTok')
                .setEmoji('🎵')
                .setURL(config.mtaSocialTiktok)
                .setStyle(ButtonStyle.Link)
        );
    }

    if (config.mtaSocialYoutube) {
        row.addComponents(
            new ButtonBuilder()
                .setLabel('YouTube')
                .setEmoji('📺')
                .setURL(config.mtaSocialYoutube)
                .setStyle(ButtonStyle.Link)
        );
    }

    // Se nenhum link estiver configurado, adiciona um botão padrão pro site para não deixar a ActionRow vazia
    if (row.components.length === 0) {
        row.addComponents(
            new ButtonBuilder()
                .setLabel('Acessar Site')
                .setEmoji('🌐')
                .setURL('https://detroit.squareweb.app')
                .setStyle(ButtonStyle.Link)
        );
    }

    return { embeds: [embed], components: [row] };
}

async function updateStatusPanel(client) {
    const channelId = config.statusPanelChannelId;
    const messageId = config.statusPanelMessageId;

    if (!channelId || !messageId) return;

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        const message = await channel.messages.fetch(messageId);
        if (!message) return;

        const payload = await buildStatusPayload();
        await message.edit(payload);
    } catch (e) {
        // Silencia erro se a mensagem foi deletada, etc.
        console.error('Erro ao atualizar Painel de Status:', e.message);
    }
}

module.exports = {
    buildStatusPayload,
    updateStatusPanel
};
