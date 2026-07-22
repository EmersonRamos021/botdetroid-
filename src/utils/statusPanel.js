const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const gamedig = require('gamedig');
const config = require('../config');

async function buildStatusPayload(client) {
    const ip = config.mtaServerIp || '144.225.189.145';
    const port = config.mtaServerPort || 22112;

    let isOnline = false;
    let players = 0;
    let maxPlayers = 0;

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
        maxPlayers = state.maxplayers || 0;
    } catch (e) {
        isOnline = false;
    }

    const embed = new EmbedBuilder()
        .setColor(isOnline ? "#0099ff" : "#ff0000")
        .setTitle("💙 Informações")
        .setDescription("Utilize Conectar-se para se conectar em nosso servidor.")
        .addFields(
            { name: "🌐 Nome do servidor:", value: "\n[BR] DETROIT ROLEPLAY\n" },
            { name: "🟢 Status:", value: isOnline ? `\nOnline (${players}/${maxPlayers})\n` : `\nOffline\n` },
            { name: "🎮 Conectar - Cole no F8:", value: `\nconnect ${ip}:${port}\n` }
        )
        .setFooter({ text: "Status atualizado a cada 2 minutos." });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel("💙 Discord")
            .setStyle(ButtonStyle.Link)
            .setURL("https://discord.gg/detroitroleplay")
    );

    // Adicionar outros botões se estiverem configurados no painel
    if (config.mtaSocialStore && row.components.length < 5) {
        row.addComponents(
            new ButtonBuilder().setLabel('Loja').setEmoji('🛒').setURL(config.mtaSocialStore).setStyle(ButtonStyle.Link)
        );
    }
    if (config.mtaSocialInsta && row.components.length < 5) {
        row.addComponents(
            new ButtonBuilder().setLabel('Instagram').setEmoji('📸').setURL(config.mtaSocialInsta).setStyle(ButtonStyle.Link)
        );
    }

    return { 
        embeds: [embed],
        components: [row]
    };
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

        const payload = await buildStatusPayload(client);
        await message.edit(payload);
    } catch (e) {
        const errorMsg = String(e.message || '').toLowerCase();
        if (errorMsg.includes('unknown message') || e.code === 10008) {
            console.log('⚠️ Mensagem de Status deletada. Removendo configuração...');
            try {
                const { removeSetting } = require('./settings');
                await removeSetting('statusPanelMessageId');
                await removeSetting('statusPanelChannelId');
                console.log('✅ Configuração removida com sucesso!');
            } catch(err) {
                console.error('❌ Erro ao tentar remover a configuração antiga:', err);
            }
        } else {
            console.error('Erro ao atualizar Painel de Status:', e.message);
        }
    }
}

module.exports = {
    buildStatusPayload,
    updateStatusPanel
};
